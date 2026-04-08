import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { EntryRecord } from "@/types/app";

interface EntryTableProps {
  entries: EntryRecord[];
}

export function EntryTable({ entries }: EntryTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Session ID</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Pending Reason</TableHead>
          <TableHead>Audit Count</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell className="font-medium capitalize">{entry.type}</TableCell>
            <TableCell>{entry.session_id}</TableCell>
            <TableCell>
              <Badge variant={entry.status === "solved" ? "success" : "warning"}>{entry.status}</Badge>
            </TableCell>
            <TableCell>{entry.pending_reason ?? "N/A"}</TableCell>
            <TableCell>{entry.audits?.length ?? 0}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
