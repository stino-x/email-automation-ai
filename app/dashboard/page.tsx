'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, Activity, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { getUser } from '@/lib/auth';

interface DashboardStats {
  total_monitored_emails: number;
  active_monitors: number;
  paused_monitors: number;
  emails_processed_today: number;
  emails_processed_this_week: number;
  recent_activity: Array<{
    status: string;
    email_checked: string;
    email_subject?: string;
    timestamp: string;
  }>;
}

export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<{id: string; email?: string} | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    total_monitored_emails: 0,
    active_monitors: 0,
    paused_monitors: 0,
    emails_processed_today: 0,
    emails_processed_this_week: 0,
    recent_activity: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const user = await getUser();
      setCurrentUser(user);
      if (user) {
        loadDashboardData(user.id);
      }
    };
    loadUser();
  }, []);

  const loadDashboardData = async (userId: string) => {
    try {
      setIsLoading(true);
      
      const configResponse = await fetch('/api/config/get', {
        headers: { 'x-user-id': userId }
      });
      const configData = await configResponse.json();

      const logsResponse = await fetch('/api/logs?limit=10', {
        headers: { 'x-user-id': userId }
      });
      const logsData = await logsResponse.json();

      // Count active vs paused monitors
      const monitors = configData.configuration?.monitored_emails || [];
      const activeCount = monitors.filter((m: {is_active?: boolean}) => m.is_active !== false).length;
      const pausedCount = monitors.length - activeCount;

      setStats({
        total_monitored_emails: monitors.length,
        active_monitors: activeCount,
        paused_monitors: pausedCount,
        emails_processed_today: 0,
        emails_processed_this_week: 0,
        recent_activity: logsData.logs || []
      });
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Dashboard</h1>

        <Card className="bg-gray-900 border-gray-800 mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-500" />
                  Monitor Status
                </CardTitle>
                <CardDescription>
                  Individual monitor controls available in configuration page
                </CardDescription>
              </div>
              <div className="flex gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">{stats.active_monitors}</div>
                  <div className="text-xs text-gray-400">Active</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-500">{stats.paused_monitors}</div>
                  <div className="text-xs text-gray-400">Paused</div>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-400" />
                Monitored Emails
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{stats.total_monitored_emails}</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-400" />
                Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{stats.emails_processed_today}</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-400" />
                This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{stats.emails_processed_this_week}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recent_activity.length === 0 ? (
              <p className="text-center py-8 text-gray-400">No recent activity</p>
            ) : (
              <div className="space-y-3">
                {stats.recent_activity.slice(0, 10).map((activity, index: number) => (
                  <div key={index} className="p-4 bg-gray-800 rounded">
                    <div className="flex justify-between items-start">
                      <div>
                        <Badge variant="outline">{activity.status}</Badge>
                        <p className="mt-2 text-sm">{activity.email_checked}</p>
                        {activity.email_subject && (
                          <p className="text-xs text-gray-400 mt-1">{activity.email_subject}</p>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(activity.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-8 flex gap-4">
          <Link href="/configuration">
            <Button size="lg">Configure Monitors</Button>
          </Link>
          <Link href="/settings">
            <Button variant="outline" size="lg">Settings</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
