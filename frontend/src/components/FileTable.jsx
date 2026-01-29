import React from "react";

export default function FileTable({ files }) {
  if (!files || files.length === 0) {
    return <div className="p-4 text-gray-600">No files yet.</div>;
  }
  return (
    <div className="overflow-x-auto bg-white rounded shadow">
      <table className="min-w-full text-sm">
        <thead className="bg-sky-100 text-sky-900">
          <tr>
            <th className="p-3 text-left">Filename</th>
            <th className="p-3 text-left">Hash</th>
            <th className="p-3 text-left">Uploader</th>
            <th className="p-3 text-left">Time</th>
            <th className="p-3 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          {files.map(f => (
            <tr key={f.id} className="border-t hover:bg-sky-50">
              <td className="p-3">{f.filename}</td>
              <td className="p-3">{(f.hash || '').slice(0, 12)}...</td>
              <td className="p-3">{f.uploadedBy}</td>
              <td className="p-3">{f.timestamp ? new Date(f.timestamp).toLocaleString() : '-'}</td>
              <td className="p-3">{f.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
