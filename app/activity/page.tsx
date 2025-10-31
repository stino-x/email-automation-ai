'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronLeft, ChevronRight, Download, Search } from 'lucide-react';
import { getUser } from '@/lib/auth';
import type { ActivityLog } from '@/types';

export default function ActivityPage() {
  const [currentUser, setCurrentUser] = useState<{id: string; email?: string} | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchEmail, setSearchEmail] = useState('');
  const limit = 20;

  useEffect(() => {
    const loadUser = async () => {
      const user = await getUser();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchEmail, currentUser]);

  const loadLogs = async () => {
    if (!currentUser) return;

    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(searchEmail && { email: searchEmail })
      });

      const response = await fetch(`/api/logs?${params}`, {
        headers: { 'x-user-id': currentUser.id }
      });
      const data = await response.json();

      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportCSV = () => {
    const headers = ['Timestamp', 'Email', 'Status', 'Subject', 'Check Number'];
    const rows = logs.map(log => [
      new Date(log.timestamp).toLocaleString(),
      log.email_checked,
      log.status,
      log.email_subject || '',
      log.check_number ? `${log.check_number}/${log.total_checks_allowed}` : ''
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-logs-${new Date().toISOString()}.csv`;
    a.click();
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      NEW_EMAIL: 'default',
      SENT: 'default',
      NO_EMAIL: 'secondary',
      ERROR: 'destructive',
      LIMIT_REACHED: 'outline'
    };
    return <Badge variant={colors[status] || 'secondary'}>{status.replace('_', ' ')}</Badge>;
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Activity Logs</h1>
            <p className="text-gray-400">View email monitoring history and responses</p>
          </div>
          <Button onClick={exportCSV} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Filters */}
        <Card className="bg-gray-900 border-gray-800 mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Filter by email address..."
                    value={searchEmail}
                    onChange={(e) => {
                      setSearchEmail(e.target.value);
                      setPage(1);
                    }}
                    className="pl-10 bg-gray-700 border-gray-600"
                  />
                </div>
              </div>
              <Button onClick={() => { setSearchEmail(''); setPage(1); }} variant="outline">
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle>
              Activity History ({total} total {total === 1 ? 'entry' : 'entries'})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p>No activity logs found</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-800">
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Email Checked</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Check #</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id} className="border-gray-800">
                          <TableCell className="text-sm">
                            {new Date(log.timestamp).toLocaleString()}
                          </TableCell>
                          <TableCell>{getStatusBadge(log.status)}</TableCell>
                          <TableCell className="font-mono text-sm">{log.email_checked}</TableCell>
                          <TableCell className="text-sm text-gray-400">
                            {log.email_subject || '-'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {log.check_number && log.total_checks_allowed
                              ? `${log.check_number}/${log.total_checks_allowed}`
                              : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-6">
                  <p className="text-sm text-gray-400">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
