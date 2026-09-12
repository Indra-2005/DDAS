"""
Webhook notification dispatcher.
Dispatches events asynchronously to Slack, Discord, and Microsoft Teams.
"""
import threading
from typing import Dict, Any
import requests
from app.repositories.settings_repository import SettingsRepository
from app.core.logging import logger

class WebhookService:
    @staticmethod
    def trigger_webhook(company: str, event_type: str, payload: Dict[str, Any]):
        """Fires webhooks asynchronously in a background daemon thread."""
        def _dispatch():
            try:
                settings = SettingsRepository.get_by_company(company)
                events = settings.get("webhook_events", {})
                if not events.get(event_type, False):
                    return

                filename = payload.get("filename", "unknown")
                owner = payload.get("owner", "unknown")

                if event_type == "upload_original":
                    message = f"New document uploaded: {filename} by {owner}"
                elif event_type == "duplicate_alert":
                    message = f"Duplicate blocked: {filename} uploaded by {owner} already exists."
                elif event_type == "dlp_violation":
                    violations = ", ".join(payload.get("violations", []))
                    message = f"DLP Alert! Sensitive data found in {filename} uploaded by {owner}. Violations: {violations}."
                else:
                    message = f"DDAS Event: {event_type} on {filename} by {owner}"

                slack_url = settings.get("slack_webhook")
                discord_url = settings.get("discord_webhook")
                teams_url = settings.get("teams_webhook")

                if slack_url:
                    try:
                        requests.post(slack_url, json={"text": message}, timeout=5)
                    except requests.RequestException as e:
                        logger.warning(f"Slack webhook error: {e}")

                if discord_url:
                    try:
                        requests.post(discord_url, json={"content": message}, timeout=5)
                    except requests.RequestException as e:
                        logger.warning(f"Discord webhook error: {e}")

                if teams_url:
                    try:
                        requests.post(teams_url, json={"text": message}, timeout=5)
                    except requests.RequestException as e:
                        logger.warning(f"Teams webhook error: {e}")

            except Exception as e:
                logger.error(f"Webhook dispatch error: {type(e).__name__}: {e}")

        threading.Thread(target=_dispatch, daemon=True).start()
