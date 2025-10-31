'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { getUser } from '@/lib/auth';

interface SystemStatus {
  database: 'connected' | 'disconnected' | 'error';
  worker: 'connected' | 'disconnected' | 'error';
  google_gmail: 'connected' | 'disconnected';
  google_calendar: 'connected' | 'disconnected';
  groq_api: 'valid' | 'invalid' | 'missing';
}

export default function SettingsPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [currentUser, setCurrentUser] = useState<{id: string; email?: string} | null>(null);

  const loadUserAndStatus = useCallback(async () => {
    try {
      // Get current user
      const user = await getUser();
      setCurrentUser(user);

      if (user) {
        loadStatus(user.id);
      }
    } catch (error) {
      console.error('Failed to load user:', error);
    }
  }, []);

  useEffect(() => {
    loadUserAndStatus();
  }, [loadUserAndStatus]);

  const loadStatus = async (userId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/status', {
        headers: { 'x-user-id': userId }
      });
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to load status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const connectGoogle = () => {
    if (!currentUser) {
      toast.error('Please log in first');
      return;
    }
    setIsConnecting(true);
    window.location.href = `/api/auth/google?user_id=${currentUser.id}`;
  };

  const disconnectGoogle = async () => {
    if (!currentUser) {
      toast.error('Please log in first');
      return;
    }

    try {
      const response = await fetch('/api/auth/google', {
        method: 'DELETE',
        headers: { 'x-user-id': currentUser.id }
      });

      if (response.ok) {
        toast.success('Google account disconnected');
        loadStatus(currentUser.id);
      } else {
        toast.error('Failed to disconnect');
      }
    } catch (error) {
      toast.error('Failed to disconnect Google account');
      console.error('Error disconnecting Google account:', error);
    }
  };

  const refreshStatus = () => {
    if (currentUser) {
      loadStatus(currentUser.id);
    } else {
      toast.error('Please log in first');
    }
  };

  const testEmailProcessing = async () => {
    if (!currentUser) {
      toast.error('Please log in first');
      return;
    }

    try {
      const response = await fetch('/api/test', {
        method: 'POST',
        headers: { 'x-user-id': currentUser.id }
      });

      const data = await response.json();
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error('Test failed');
    }
  };

  const checkTokenStatus = async () => {
    if (!currentUser) {
      toast.error('Please log in first');
      return;
    }

    try {
      const response = await fetch('/api/auth/google/status', {
        headers: { 'x-user-id': currentUser.id }
      });

      const data = await response.json();
      if (data.has_tokens) {
        toast.success(`Google connected! Scopes: ${data.scopes?.join(', ') || 'N/A'}`, {
          duration: 5000,
          description: `Expires: ${data.expires_at ? new Date(data.expires_at).toLocaleString() : 'Unknown'}`
        });
      } else {
        toast.error('No Google tokens found in database');
      }
    } catch (error) {
      toast.error('Failed to check token status');
      console.error('Token status check failed:', error);
    }
  };

  const checkUserDebugInfo = async () => {
    if (!currentUser) {
      toast.error('Please log in first');
      return;
    }

    try {
      const response = await fetch('/api/debug/user-info', {
        headers: { 'x-user-id': currentUser.id }
      });

      const data = await response.json();
      console.log('=== DEBUG INFO ===', data);
      
      if (data.success) {
        const info = [
          `User ID: ${data.user?.id}`,
          `Email: ${data.user?.email}`,
          `Tokens: ${data.tokens?.found ? '✓ Found' : '✗ Not Found'}`,
          `Config: ${data.configuration?.found ? '✓ Found' : '✗ Not Found'}`
        ].join('\n');
        
        toast.success('Debug info logged to console', {
          duration: 5000,
          description: info
        });
      } else {
        toast.error(`Debug check failed: ${data.message}`);
      }
    } catch (error) {
      toast.error('Failed to get debug info');
      console.error('Debug info check failed:', error);
    }
  };

  const getStatusIcon = (state: string) => {
    if (state === 'connected' || state === 'valid') {
      return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    } else if (state === 'error' || state === 'invalid') {
      return <XCircle className="w-5 h-5 text-red-500" />;
    } else {
      return <XCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (state: string) => {
    if (state === 'connected' || state === 'valid') {
      return <Badge className="bg-green-600">Connected</Badge>;
    } else if (state === 'error' || state === 'invalid') {
      return <Badge variant="destructive">Error</Badge>;
    } else {
      return <Badge variant="outline">Not Connected</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">Settings</h1>
        <p className="text-gray-400 mb-8">Manage integrations and system configuration</p>

        {/* Google Integration */}
        <Card className="bg-gray-900 border-gray-800 mb-8">
          <CardHeader>
            <CardTitle>Google Integration</CardTitle>
            <CardDescription>Connect your Gmail and Google Calendar accounts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(status?.google_gmail || 'disconnected')}
                <div>
                  <p className="font-medium">Gmail</p>
                  <p className="text-sm text-gray-400">Read and send emails</p>
                </div>
              </div>
              {getStatusBadge(status?.google_gmail || 'disconnected')}
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(status?.google_calendar || 'disconnected')}
                <div>
                  <p className="font-medium">Google Calendar</p>
                  <p className="text-sm text-gray-400">Check availability</p>
                </div>
              </div>
              {getStatusBadge(status?.google_calendar || 'disconnected')}
            </div>

            <div className="flex gap-3">
              {status?.google_gmail === 'connected' ? (
                <Button onClick={disconnectGoogle} variant="destructive">
                  Disconnect Google
                </Button>
              ) : (
                <Button onClick={connectGoogle} disabled={isConnecting}>
                  {isConnecting ? 'Connecting...' : 'Connect Google Account'}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => window.open('https://console.cloud.google.com', '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Google Console
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card className="bg-gray-900 border-gray-800 mb-8">
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Monitor service health</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(status?.database || 'disconnected')}
                <div>
                  <p className="font-medium">Database (Supabase)</p>
                  <p className="text-sm text-gray-400">PostgreSQL connection</p>
                </div>
              </div>
              {getStatusBadge(status?.database || 'disconnected')}
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(status?.worker || 'disconnected')}
                <div>
                  <p className="font-medium">Background Worker</p>
                  <p className="text-sm text-gray-400">Email monitoring service</p>
                </div>
              </div>
              {getStatusBadge(status?.worker || 'disconnected')}
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(status?.groq_api || 'missing')}
                <div>
                  <p className="font-medium">Groq AI API</p>
                  <p className="text-sm text-gray-400">AI response generation</p>
                </div>
              </div>
              {getStatusBadge(status?.groq_api || 'missing')}
            </div>
          </CardContent>
        </Card>

        {/* Testing */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle>Testing & Debugging</CardTitle>
            <CardDescription>Test your configuration without sending real emails</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={testEmailProcessing} variant="outline" className="w-full">
              Run Test Email Check
            </Button>
            <Button onClick={checkTokenStatus} variant="outline" className="w-full">
              Check Google Token Status
            </Button>
            <Button onClick={checkUserDebugInfo} variant="outline" className="w-full">
              Show Full Debug Info
            </Button>
            <Button onClick={refreshStatus} variant="outline" className="w-full">
              Refresh Status
            </Button>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="mt-8 p-4 bg-gray-900 border border-gray-800 rounded-lg">
          <h3 className="font-semibold mb-3">Quick Links</h3>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="ghost"
              className="justify-start"
              onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Supabase Dashboard
            </Button>
            <Button
              variant="ghost"
              className="justify-start"
              onClick={() => window.open('https://console.groq.com', '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Groq Console
            </Button>
            <Button
              variant="ghost"
              className="justify-start"
              onClick={() => window.open('https://railway.app', '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Railway (Worker)
            </Button>
            <Button
              variant="ghost"
              className="justify-start"
              onClick={() => window.open('https://vercel.com/dashboard', '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Vercel Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
