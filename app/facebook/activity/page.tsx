'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { MessageCircle, ArrowLeft, Search, Download, RefreshCw } from 'lucide-react';
import type { FacebookActivityLog } from '@/types/facebook';

export default function FacebookActivityPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<FacebookActivityLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<FacebookActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const getAuthHeaders = () => {
    const credentials = btoa(`${authUsername}:${authPassword}`);
    return {
      'Authorization': `Basic ${credentials}`
    };
  };

  const loadLogs = async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    try {
      const response = await fetch('/api/facebook/logs', {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
        setFilteredLogs(data.logs || []);
      } else {
        toast.error('Failed to load activity logs');
      }
    } catch (error) {
      toast.error('Error loading logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadLogs();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const filtered = logs.filter(log =>
      log.thread_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.sender_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.message_content.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredLogs(filtered);
  }, [searchTerm, logs]);

  const exportToCSV = () => {
    const csvContent = [
      ['Time', 'Thread', 'Sender', 'Message', 'AI Response', 'Status'].join(','),
      ...filteredLogs.map(log => [
        new Date(log.timestamp).toLocaleString(),
        log.thread_name,
        log.sender_name,
        `"${log.message_content.replace(/"/g, '""')}"`,
        `"${(log.ai_response || '').replace(/"/g, '""')}"`,
        log.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `facebook-activity-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RESPONDED': return 'bg-green-500';
      case 'NEW_MESSAGE': return 'bg-blue-500';
      case 'FILTERED': return 'bg-gray-500';
      case 'ERROR': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // Auth check
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Authentication Required</CardTitle>
            <CardDescription className="text-gray-400">
              Enter credentials to view Facebook activity logs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="text"
              placeholder="Username"
              value={authUsername}
              onChange={(e) => setAuthUsername(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white"
            />
            <Input
              type="password"
              placeholder="Password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white"
              onKeyPress={(e) => e.key === 'Enter' && setIsAuthenticated(true)}
            />
            <Button
              onClick={() => setIsAuthenticated(true)}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Access Logs
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <MessageCircle className="w-8 h-8 text-blue-500" />
              Facebook Activity Logs
            </h1>
            <p className="text-gray-400 mt-2">
              View all monitored messages and AI responses
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push('/facebook')}
            className="border-gray-600 text-white hover:bg-gray-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Monitors
          </Button>
        </div>

        {/* Actions */}
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Search by thread, sender, or message..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-700 border-gray-600"
                />
              </div>
              <Button
                onClick={loadLogs}
                variant="outline"
                className="border-gray-600"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button
                onClick={exportToCSV}
                className="bg-green-600 hover:bg-green-700"
                disabled={filteredLogs.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle>Activity History ({filteredLogs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-gray-400">Loading logs...</div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                No activity logs found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700">
                      <TableHead className="text-gray-400">Time</TableHead>
                      <TableHead className="text-gray-400">Thread</TableHead>
                      <TableHead className="text-gray-400">Sender</TableHead>
                      <TableHead className="text-gray-400">Message</TableHead>
                      <TableHead className="text-gray-400">AI Response</TableHead>
                      <TableHead className="text-gray-400">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id} className="border-gray-700">
                        <TableCell className="text-sm text-gray-300">
                          {new Date(log.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-medium">{log.thread_name}</TableCell>
                        <TableCell className="text-gray-300">{log.sender_name}</TableCell>
                        <TableCell className="max-w-xs truncate text-gray-400">
                          {log.message_content}
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-gray-400">
                          {log.ai_response || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(log.status)}>
                            {log.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
