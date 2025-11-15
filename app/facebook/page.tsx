'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { MessageCircle, Plus, Trash2, Settings, Save, AlertTriangle, Lock, Users, User } from 'lucide-react';
import type { FacebookMonitor, FacebookConfiguration } from '@/types/facebook';

export default function FacebookMonitoringPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(true);
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [config, setConfig] = useState<FacebookConfiguration | null>(null);
  const [monitors, setMonitors] = useState<FacebookMonitor[]>([]);
  const [defaultPrompt, setDefaultPrompt] = useState('You are a helpful assistant. Respond naturally and conversationally to this message.');
  const [checkInterval, setCheckInterval] = useState(60);
  const [calendarId, setCalendarId] = useState('primary');
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Facebook-specific auth headers
  const getAuthHeaders = () => {
    const credentials = btoa(`${authUsername}:${authPassword}`);
    return {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json'
    };
  };

  // Authenticate to Facebook section
  const handleAuthenticate = async () => {
    if (!authUsername || !authPassword) {
      toast.error('Please enter both username and password');
      return;
    }

    setAuthLoading(true);
    try {
      const response = await fetch('/api/facebook/auth', {
        method: 'POST',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        setIsAuthenticated(true);
        setShowAuthDialog(false);
        toast.success('Access granted to Facebook monitoring');
        loadConfiguration();
      } else {
        toast.error('Invalid credentials for Facebook section');
      }
    } catch (error) {
      toast.error('Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  // Load configuration
  const loadConfiguration = async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    try {
      const response = await fetch('/api/facebook/config/get', {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        if (data.config) {
          setConfig(data.config);
          setMonitors(data.config.monitors || []);
          setDefaultPrompt(data.config.default_prompt_template || defaultPrompt);
          setCheckInterval(data.config.check_interval_seconds || 60);
          setCalendarId(data.config.calendar_id || 'primary');
          setIsActive(data.config.is_active || false);
        }
      }
    } catch (error) {
      toast.error('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  // Save configuration
  const handleSave = async () => {
    if (!isAuthenticated) return;

    // Validation
    if (monitors.length === 0) {
      toast.error('Add at least one monitor');
      return;
    }

    for (const monitor of monitors) {
      if (!monitor.thread_id || !monitor.thread_name) {
        toast.error('All monitors must have thread ID and name');
        return;
      }
    }

    setSaving(true);
    try {
      const response = await fetch('/api/facebook/config/save', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          monitors,
          default_prompt_template: defaultPrompt,
          check_interval_seconds: checkInterval,
          calendar_id: calendarId,
          is_active: isActive
        })
      });

      if (response.ok) {
        toast.success('Configuration saved successfully!');
        loadConfiguration();
      } else {
        toast.error('Failed to save configuration');
      }
    } catch (error) {
      toast.error('Error saving configuration');
    } finally {
      setSaving(false);
    }
  };

  // Toggle service
  const handleToggleService = async () => {
    if (!isAuthenticated) return;

    const newStatus = !isActive;
    try {
      const response = await fetch('/api/facebook/service/toggle', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isActive: newStatus })
      });

      if (response.ok) {
        setIsActive(newStatus);
        toast.success(newStatus ? 'Monitoring started' : 'Monitoring stopped');
      }
    } catch (error) {
      toast.error('Failed to toggle service');
    }
  };

  // Add monitor
  const addMonitor = () => {
    const newMonitor: FacebookMonitor = {
      monitor_type: 'group',
      thread_id: '',
      thread_name: '',
      keywords: [],
      ai_prompt_template: defaultPrompt,
      auto_respond: true,
      is_active: true
    };
    setMonitors([...monitors, newMonitor]);
  };

  // Remove monitor
  const removeMonitor = (index: number) => {
    setMonitors(monitors.filter((_, i) => i !== index));
  };

  // Update monitor
  const updateMonitor = (index: number, updates: Partial<FacebookMonitor>) => {
    const updated = [...monitors];
    updated[index] = { ...updated[index], ...updates };
    setMonitors(updated);
  };

  // Auth Dialog
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Lock className="w-16 h-16 text-blue-500" />
            </div>
            <CardTitle className="text-2xl text-white">Facebook Monitoring Access</CardTitle>
            <CardDescription className="text-gray-400">
              This section requires special authentication. Enter your credentials.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-white">Username</Label>
              <Input
                type="text"
                value={authUsername}
                onChange={(e) => setAuthUsername(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="Enter username"
                onKeyPress={(e) => e.key === 'Enter' && handleAuthenticate()}
              />
            </div>
            <div>
              <Label className="text-white">Password</Label>
              <Input
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="Enter password"
                onKeyPress={(e) => e.key === 'Enter' && handleAuthenticate()}
              />
            </div>
            <Button
              onClick={handleAuthenticate}
              disabled={authLoading}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {authLoading ? 'Authenticating...' : 'Access Facebook Monitoring'}
            </Button>
            <div className="text-center">
              <Button
                variant="ghost"
                onClick={() => router.push('/dashboard')}
                className="text-gray-400 hover:text-white"
              >
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main interface
  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <MessageCircle className="w-8 h-8 text-blue-500" />
              Facebook Messenger Monitoring
            </h1>
            <p className="text-gray-400 mt-2">
              Monitor group chats or DMs and auto-respond with AI
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Service:</span>
              <Switch
                checked={isActive}
                onCheckedChange={handleToggleService}
              />
              <Badge variant={isActive ? 'default' : 'secondary'}>
                {isActive ? 'Active' : 'Paused'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Warning Banner */}
        <Card className="bg-yellow-900/20 border-yellow-700">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
              <div className="text-sm text-yellow-200">
                <strong>Important:</strong> You'll need to set up Facebook credentials separately. 
                This feature uses unofficial APIs and requires your Facebook session data.
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuration Tabs */}
        <Tabs defaultValue="monitors" className="space-y-6">
          <TabsList className="bg-gray-800">
            <TabsTrigger value="monitors">Monitors ({monitors.length})</TabsTrigger>
            <TabsTrigger value="settings">Global Settings</TabsTrigger>
          </TabsList>

          {/* Monitors Tab */}
          <TabsContent value="monitors" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-gray-400">
                Configure which conversations to monitor and auto-respond to
              </p>
              <Button onClick={addMonitor} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Monitor
              </Button>
            </div>

            {monitors.length === 0 ? (
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-12 text-center">
                  <MessageCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 mb-4">No monitors configured yet</p>
                  <Button onClick={addMonitor} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Monitor
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {monitors.map((monitor, index) => (
                  <Card key={index} className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {monitor.monitor_type === 'group' ? (
                            <Users className="w-5 h-5 text-blue-500" />
                          ) : (
                            <User className="w-5 h-5 text-green-500" />
                          )}
                          <div>
                            <CardTitle className="text-lg">
                              {monitor.thread_name || `Monitor ${index + 1}`}
                            </CardTitle>
                            <CardDescription>
                              {monitor.monitor_type === 'group' ? 'Group Chat' : 'Direct Message'}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={monitor.is_active}
                            onCheckedChange={(checked) => updateMonitor(index, { is_active: checked })}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMonitor(index)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Type</Label>
                          <Select
                            value={monitor.monitor_type}
                            onValueChange={(value: 'group' | 'dm') => 
                              updateMonitor(index, { monitor_type: value })
                            }
                          >
                            <SelectTrigger className="bg-gray-700 border-gray-600">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="group">Group Chat</SelectItem>
                              <SelectItem value="dm">Direct Message</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Thread ID *</Label>
                          <Input
                            value={monitor.thread_id}
                            onChange={(e) => updateMonitor(index, { thread_id: e.target.value })}
                            placeholder="1234567890"
                            className="bg-gray-700 border-gray-600"
                          />
                          <p className="text-xs text-gray-400 mt-1">Get from Facebook URL</p>
                        </div>
                      </div>

                      <div>
                        <Label>Display Name *</Label>
                        <Input
                          value={monitor.thread_name}
                          onChange={(e) => updateMonitor(index, { thread_name: e.target.value })}
                          placeholder="Work Team Group / John Doe"
                          className="bg-gray-700 border-gray-600"
                        />
                      </div>

                      {monitor.monitor_type === 'group' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Monitor Specific Person (optional)</Label>
                            <Input
                              value={monitor.monitored_sender_id || ''}
                              onChange={(e) => updateMonitor(index, { monitored_sender_id: e.target.value })}
                              placeholder="Facebook User ID"
                              className="bg-gray-700 border-gray-600"
                            />
                          </div>
                          <div>
                            <Label>Person's Name</Label>
                            <Input
                              value={monitor.monitored_sender_name || ''}
                              onChange={(e) => updateMonitor(index, { monitored_sender_name: e.target.value })}
                              placeholder="Boss Name"
                              className="bg-gray-700 border-gray-600"
                            />
                          </div>
                        </div>
                      )}

                      <div>
                        <Label>Keywords (optional, comma-separated)</Label>
                        <Input
                          value={monitor.keywords?.join(', ') || ''}
                          onChange={(e) => updateMonitor(index, {
                            keywords: e.target.value.split(',').map(k => k.trim()).filter(Boolean)
                          })}
                          placeholder="urgent, help, question"
                          className="bg-gray-700 border-gray-600"
                        />
                        <p className="text-xs text-gray-400 mt-1">Only respond to messages with these words</p>
                      </div>

                      <div>
                        <Label>AI Prompt Template</Label>
                        <Textarea
                          value={monitor.ai_prompt_template}
                          onChange={(e) => updateMonitor(index, { ai_prompt_template: e.target.value })}
                          rows={3}
                          className="bg-gray-700 border-gray-600"
                          placeholder="Custom instructions for AI responses..."
                        />
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={monitor.auto_respond}
                            onCheckedChange={(checked) => updateMonitor(index, { auto_respond: checked })}
                          />
                          <Label>Auto-respond to messages</Label>
                        </div>
                        <Badge variant={monitor.auto_respond ? 'default' : 'secondary'}>
                          {monitor.auto_respond ? 'Will Respond' : 'Monitor Only'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle>Global Settings</CardTitle>
                <CardDescription>Configure default behavior for all monitors</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Check Interval (seconds)</Label>
                  <Input
                    type="number"
                    value={checkInterval}
                    onChange={(e) => setCheckInterval(parseInt(e.target.value) || 60)}
                    min={30}
                    max={600}
                    className="bg-gray-700 border-gray-600"
                  />
                  <p className="text-xs text-gray-400 mt-1">How often to check for new messages (30-600 seconds)</p>
                </div>

                <div>
                  <Label>Default AI Prompt Template</Label>
                  <Textarea
                    value={defaultPrompt}
                    onChange={(e) => setDefaultPrompt(e.target.value)}
                    rows={5}
                    className="bg-gray-700 border-gray-600"
                    placeholder="Enter default instructions for AI..."
                  />
                  <p className="text-xs text-gray-400 mt-1">Used for new monitors</p>
                </div>

                <div>
                  <Label htmlFor="fb-calendar-id">Google Calendar ID</Label>
                  <Input
                    id="fb-calendar-id"
                    type="text"
                    value={calendarId}
                    onChange={(e) => setCalendarId(e.target.value)}
                    placeholder="primary"
                    className="bg-gray-700 border-gray-600"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Use &quot;primary&quot; for main calendar, or specific calendar ID for {'{CALENDAR_EVENTS}'} placeholder
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4">
          <Button
            variant="outline"
            onClick={() => router.push('/facebook/activity')}
            className="border-gray-600 text-white hover:bg-gray-800"
          >
            View Activity Logs
          </Button>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard')}
              className="border-gray-600 text-white hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
