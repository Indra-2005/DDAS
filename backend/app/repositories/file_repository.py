"""
Tenant-scoped file repository for MongoDB operations.
Enforces tenant isolation on all file-related queries and mutations.
"""
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional, Tuple
from bson import ObjectId
from app.db.database import files_collection
from app.algorithms.hashing import safe_object_id

class FileRepository:
    @staticmethod
    def find_by_id_scoped(file_id: str, company: str) -> Optional[Dict[str, Any]]:
        """Finds a single file document guaranteed to belong to company tenant."""
        oid = safe_object_id(file_id)
        return files_collection.find_one({"_id": oid, "company": company})

    @staticmethod
    def list_by_tenant(
        company: str,
        skip: int = 0,
        limit: int = 20
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Lists files scoped to tenant company with pagination and total count."""
        query = {"company": company}
        total = files_collection.count_documents(query)
        cursor = files_collection.find(query).sort("upload_date", -1).skip(skip).limit(limit)
        items = []
        for doc in cursor:
            doc["_id"] = str(doc["_id"])
            items.append(doc)
        return items, total

    @staticmethod
    def list_all_by_tenant_raw(company: str) -> List[Dict[str, Any]]:
        """Returns all file documents for the tenant (for backward-compatible /files endpoint)."""
        cursor = files_collection.find({"company": company}).sort("upload_date", -1)
        items = []
        for doc in cursor:
            doc["_id"] = str(doc["_id"])
            items.append(doc)
        return items

    @staticmethod
    def insert_file(file_doc: Dict[str, Any]) -> str:
        """Inserts a new file document and returns its stringified ObjectId."""
        if "upload_date" not in file_doc:
            file_doc["upload_date"] = datetime.now(timezone.utc)
        result = files_collection.insert_one(file_doc)
        return str(result.inserted_id)

    @staticmethod
    def delete_file_scoped(file_id: str, company: str) -> Optional[Dict[str, Any]]:
        """
        Atomically finds and deletes the file document scoped to the company tenant.
        Returns the deleted document, or None if not found.
        """
        oid = safe_object_id(file_id)
        return files_collection.find_one_and_delete({"_id": oid, "company": company})

    @staticmethod
    def update_file_scoped(file_id: str, company: str, updates: Dict[str, Any]) -> bool:
        """Updates fields of a tenant-scoped file document."""
        oid = safe_object_id(file_id)
        result = files_collection.update_one(
            {"_id": oid, "company": company},
            {"$set": updates}
        )
        return result.matched_count > 0

    @staticmethod
    def get_tenant_minhash_candidates(company: str) -> List[Dict[str, Any]]:
        """Retrieves stored MinHash values for files in the same tenant."""
        cursor = files_collection.find(
            {
                "company": company,
                "minhash_values": {"$exists": True, "$ne": None}
            },
            {"_id": 1, "minhash_values": 1, "filename": 1}
        )
        return list(cursor)

    @staticmethod
    def get_tenant_image_candidates(company: str, dhash_buckets: List[str]) -> List[Dict[str, Any]]:
        """
        Retrieves tenant image records matching at least one perceptual hash bucket token.
        Preserves strict tenant isolation and includes legacy records (without dhash_buckets)
        for backward compatibility.
        """
        if not dhash_buckets:
            cursor = files_collection.find(
                {"company": company, "image_dhash": {"$exists": True, "$ne": None}},
                {"_id": 1, "image_dhash": 1}
            )
            return list(cursor)

        query = {
            "company": company,
            "$or": [
                {"dhash_buckets": {"$in": dhash_buckets}},
                {"dhash_buckets": {"$exists": False}, "image_dhash": {"$exists": True, "$ne": None}}
            ]
        }
        cursor = files_collection.find(query, {"_id": 1, "image_dhash": 1})
        return list(cursor)

    @staticmethod
    def get_quarantined_scoped(company: str, skip: int = 0, limit: int = 50) -> Tuple[List[Dict[str, Any]], int]:
        """Retrieves quarantined files for tenant admin remediation, paginated."""
        query = {"company": company, "quarantine_status": "quarantined"}
        total = files_collection.count_documents(query)
        cursor = files_collection.find(query).sort("upload_date", -1).skip(skip).limit(limit)
        items = []
        for doc in cursor:
            doc["_id"] = str(doc["_id"])
            items.append(doc)
        return items, total

    @staticmethod
    def get_duplicates_aggregation(company: str) -> List[Dict[str, Any]]:
        """Returns aggregated duplicates within tenant."""
        pipeline = [
            {"$match": {"company": company}},
            {"$group": {
                "_id": "$hash",
                "count": {"$sum": 1},
                "total_size": {"$sum": "$size"},
                "files": {"$push": {
                    "filename": "$filename",
                    "owner": "$owner",
                    "upload_date": "$upload_date",
                    "_id": {"$toString": "$_id"}
                }}
            }},
            {"$match": {"count": {"$gt": 1}}},
            {"$sort": {"total_size": -1}}
        ]
        return list(files_collection.aggregate(pipeline))

    @staticmethod
    def get_dashboard_metrics(company: str) -> Dict[str, Any]:
        """
        Computes dashboard stats via MongoDB aggregation pipelines.
        Tenant-scoped and memory-efficient — does NOT load all documents.
        """
        # --- Core metrics via single aggregation ---
        core_pipeline = [
            {"$match": {"company": company}},
            {"$group": {
                "_id": None,
                "total_files": {"$sum": 1},
                "total_size": {"$sum": "$size"},
                "duplicates_blocked": {"$sum": {"$cond": [{"$eq": ["$is_duplicate", True]}, 1, 0]}},
                "saved_size": {"$sum": {"$cond": [{"$eq": ["$is_duplicate", True]}, "$size", 0]}}
            }}
        ]
        core_result = list(files_collection.aggregate(core_pipeline))
        if core_result:
            core = core_result[0]
            total_files = core.get("total_files", 0)
            total_size = core.get("total_size", 0)
            duplicates_blocked = core.get("duplicates_blocked", 0)
            saved_size = core.get("saved_size", 0)
        else:
            total_files = total_size = duplicates_blocked = saved_size = 0

        # --- Activity chart: uploads per day for the last 7 days ---
        today = datetime.now(timezone.utc).date()
        week_ago = today - timedelta(days=6)
        week_ago_dt = datetime.combine(week_ago, datetime.min.time()).replace(tzinfo=timezone.utc)

        activity_pipeline = [
            {"$match": {"company": company, "upload_date": {"$gte": week_ago_dt}}},
            {"$group": {
                "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$upload_date"}},
                "count": {"$sum": 1}
            }}
        ]
        activity_results = {r["_id"]: r["count"] for r in files_collection.aggregate(activity_pipeline)}

        last_7_days = [(today - timedelta(days=i)) for i in range(6, -1, -1)]
        chart_data = [
            {"day": d.strftime("%a"), "files": activity_results.get(d.strftime("%Y-%m-%d"), 0)}
            for d in last_7_days
        ]

        # --- Top hoarders: users with most duplicate storage ---
        hoarder_pipeline = [
            {"$match": {"company": company, "is_duplicate": True}},
            {"$group": {
                "_id": "$owner",
                "space_wasted_bytes": {"$sum": "$size"}
            }},
            {"$sort": {"space_wasted_bytes": -1}},
            {"$limit": 5}
        ]
        top_hoarders_list = [
            {"owner": h["_id"], "space_wasted_mb": round(h["space_wasted_bytes"] / (1024 * 1024), 2)}
            for h in files_collection.aggregate(hoarder_pipeline)
        ]

        # --- DLP trends: violation counts by rule name ---
        dlp_pipeline = [
            {"$match": {"company": company, "dlp_violations": {"$ne": []}}},
            {"$unwind": "$dlp_violations"},
            {"$group": {"_id": "$dlp_violations", "value": {"$sum": 1}}}
        ]
        dlp_trends_list = [
            {"name": r["_id"], "value": r["value"]}
            for r in files_collection.aggregate(dlp_pipeline)
        ]

        # --- Reclaimed timeline: cumulative saved storage over last 7 days ---
        reclaimed_pipeline = [
            {"$match": {"company": company, "is_duplicate": True, "upload_date": {"$gte": week_ago_dt}}},
            {"$group": {
                "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$upload_date"}},
                "reclaimed_bytes": {"$sum": "$size"}
            }}
        ]
        reclaimed_results = {r["_id"]: r["reclaimed_bytes"] for r in files_collection.aggregate(reclaimed_pipeline)}

        # Get cumulative sum of duplicates before this week
        before_pipeline = [
            {"$match": {"company": company, "is_duplicate": True, "upload_date": {"$lt": week_ago_dt}}},
            {"$group": {"_id": None, "total": {"$sum": "$size"}}}
        ]
        before_result = list(files_collection.aggregate(before_pipeline))
        cumulative = (before_result[0]["total"] / (1024 * 1024)) if before_result else 0.0

        reclaimed_timeline_list = []
        for d in last_7_days:
            day_key = d.strftime("%Y-%m-%d")
            cumulative += reclaimed_results.get(day_key, 0) / (1024 * 1024)
            reclaimed_timeline_list.append({
                "day": d.strftime("%a"),
                "reclaimed_mb": round(cumulative, 2)
            })

        def format_bytes(s: int) -> str:
            if s == 0:
                return "0 B"
            s_float = float(s)
            for u in ['B', 'KB', 'MB', 'GB']:
                if s_float < 1024:
                    return f"{s_float:.1f} {u}"
                s_float /= 1024
            return f"{s_float:.1f} TB"

        return {
            "total_files": total_files,
            "duplicates_blocked": duplicates_blocked,
            "storage_saved": format_bytes(saved_size),
            "storage_saved_bytes": saved_size,
            "total_storage": format_bytes(total_size),
            "total_storage_bytes": total_size,
            "activity_chart": chart_data,
            "top_hoarders": top_hoarders_list,
            "dlp_trends": dlp_trends_list,
            "reclaimed_timeline": reclaimed_timeline_list
        }
