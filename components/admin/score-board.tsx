"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PerformanceRecord } from "@/types/app";

interface ScoreBoardProps {
  scores: PerformanceRecord[];
}

export function ScoreBoard({ scores }: ScoreBoardProps) {
  const chartData = scores.map((score) => ({
    name: score.users?.email ?? score.user_id.slice(0, 8),
    score: score.score
  }));

  return (
    <Card id="performance">
      <CardHeader>
        <CardTitle>Performance Tracking</CardTitle>
        <CardDescription>Monthly scores start at 100 and lose one point for each validated issue.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="h-[280px] rounded-2xl border border-border bg-white p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="name" hide />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="score" fill="#0ea5e9" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Issues</TableHead>
              <TableHead>Deductions</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scores.map((score) => (
              <TableRow key={score.user_id}>
                <TableCell className="font-medium">{score.users?.email ?? "Unknown member"}</TableCell>
                <TableCell>{score.score}</TableCell>
                <TableCell>{score.issues_count}</TableCell>
                <TableCell>{score.deductions}</TableCell>
                <TableCell>
                  <Badge variant={score.score < 90 ? "destructive" : "success"}>
                    {score.score < 90 ? "Attention" : "Healthy"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
