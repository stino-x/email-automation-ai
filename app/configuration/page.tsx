'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Plus, Trash2, Save, Calendar as CalendarIcon, X } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { getUser } from '@/lib/auth';
import type { MonitoredEmail } from '@/types';

export default function ConfigurationPage() {
  const [currentUser, setCurrentUser] = useState<{id: string; email?: string} | null>(null);
  const [monitors, setMonitors] = useState<MonitoredEmail[]>([]);
  const [aiPrompt, setAiPrompt] = useState(
    'You are my personal assistant. Read this email and respond professionally.\n\n' +
    'Email from {SENDER_NAME} ({SENDER_EMAIL}):\n' +
    'Subject: {EMAIL_SUBJECT}\n\n' +
    '{EMAIL_CONTENT}\n\n' +
    'Please draft a helpful response.'
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const user = await getUser();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  const addMonitor = () => {
    const newMonitor: MonitoredEmail = {
      sender_email: '',
      keywords: [],
      schedule_type: 'recurring',
      recurring_config: {
        days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        start_time: '09:00',
        end_time: '17:00',
        interval_minutes: 15,
        max_checks_per_day: 30
      },
      stop_after_response: 'never'
    };
    setMonitors([...monitors, newMonitor]);
  };

  const removeMonitor = (index: number) => {
    setMonitors(monitors.filter((_, i) => i !== index));
  };

  const updateMonitor = (index: number, updates: Partial<MonitoredEmail>) => {
    const updated = [...monitors];
    updated[index] = { ...updated[index], ...updates };
    setMonitors(updated);
  };

  const saveConfiguration = async () => {
    if (!currentUser) {
      toast.error('Please log in to save configuration');
      return;
    }

    try {
      setIsSaving(true);

      const response = await fetch('/api/config/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id
        },
        body: JSON.stringify({
          configuration: {
            monitored_emails: monitors,
            ai_prompt_template: aiPrompt,
            is_active: false,
            max_emails_per_period: 10,
            once_per_window: true
          }
        })
      });

      if (response.ok) {
        toast.success('Configuration saved successfully!');
      } else {
        toast.error('Failed to save configuration');
      }
    } catch {
      toast.error('Error saving configuration');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">Configuration</h1>
        <p className="text-gray-400 mb-8">Set up email monitoring and AI responses</p>

        {/* Email Monitors */}
        <Card className="bg-gray-900 border-gray-800 mb-8">
          <CardHeader>
            <CardTitle>Email Monitors</CardTitle>
            <CardDescription>Add email addresses to monitor and configure schedules</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {monitors.map((monitor, index) => (
              <Card key={index} className="bg-gray-800 border-gray-700">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold">Monitor #{index + 1}</h3>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeMonitor(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label>Sender Email Address</Label>
                      <Input
                        placeholder="sender@example.com"
                        value={monitor.sender_email}
                        onChange={(e) => updateMonitor(index, { sender_email: e.target.value })}
                        className="bg-gray-700 border-gray-600"
                      />
                    </div>

                    <div>
                      <Label>Subject Keywords (optional, comma-separated)</Label>
                      <Input
                        placeholder="urgent, meeting, important"
                        value={monitor.keywords?.join(', ') || ''}
                        onChange={(e) =>
                          updateMonitor(index, {
                            keywords: e.target.value.split(',').map(k => k.trim()).filter(Boolean)
                          })
                        }
                        className="bg-gray-700 border-gray-600"
                      />
                    </div>

                    <Tabs defaultValue="recurring" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="recurring">Recurring</TabsTrigger>
                        <TabsTrigger value="specific">Specific Dates</TabsTrigger>
                        <TabsTrigger value="hybrid">Hybrid</TabsTrigger>
                      </TabsList>

                      <TabsContent value="recurring" className="space-y-4">
                        <div>
                          <Label>Days of Week</Label>
                          <div className="grid grid-cols-4 gap-2 mt-2">
                            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(
                              (day) => (
                                <div key={day} className="flex items-center space-x-2">
                                  <Checkbox
                                    checked={monitor.recurring_config?.days.includes(day)}
                                    onCheckedChange={(checked) => {
                                      const days = monitor.recurring_config?.days || [];
                                      updateMonitor(index, {
                                        recurring_config: {
                                          ...monitor.recurring_config!,
                                          days: checked
                                            ? [...days, day]
                                            : days.filter(d => d !== day)
                                        }
                                      });
                                    }}
                                  />
                                  <Label className="capitalize text-sm">{day.slice(0, 3)}</Label>
                                </div>
                              )
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Start Time</Label>
                            <Input
                              type="time"
                              value={monitor.recurring_config?.start_time || '09:00'}
                              onChange={(e) =>
                                updateMonitor(index, {
                                  recurring_config: {
                                    ...monitor.recurring_config!,
                                    start_time: e.target.value
                                  }
                                })
                              }
                              className="bg-gray-700 border-gray-600"
                            />
                          </div>
                          <div>
                            <Label>End Time</Label>
                            <Input
                              type="time"
                              value={monitor.recurring_config?.end_time || '17:00'}
                              onChange={(e) =>
                                updateMonitor(index, {
                                  recurring_config: {
                                    ...monitor.recurring_config!,
                                    end_time: e.target.value
                                  }
                                })
                              }
                              className="bg-gray-700 border-gray-600"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Check Every (minutes)</Label>
                            <Select
                              value={String(monitor.recurring_config?.interval_minutes || 15)}
                              onValueChange={(value) =>
                                updateMonitor(index, {
                                  recurring_config: {
                                    ...monitor.recurring_config!,
                                    interval_minutes: parseInt(value)
                                  }
                                })
                              }
                            >
                              <SelectTrigger className="bg-gray-700 border-gray-600">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">1 minute</SelectItem>
                                <SelectItem value="2">2 minutes</SelectItem>
                                <SelectItem value="5">5 minutes</SelectItem>
                                <SelectItem value="10">10 minutes</SelectItem>
                                <SelectItem value="15">15 minutes</SelectItem>
                                <SelectItem value="30">30 minutes</SelectItem>
                                <SelectItem value="60">60 minutes</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Max Checks Per Day</Label>
                            <Input
                              type="number"
                              value={monitor.recurring_config?.max_checks_per_day || 30}
                              onChange={(e) =>
                                updateMonitor(index, {
                                  recurring_config: {
                                    ...monitor.recurring_config!,
                                    max_checks_per_day: parseInt(e.target.value)
                                  }
                                })
                              }
                              className="bg-gray-700 border-gray-600"
                            />
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="specific" className="space-y-4">
                        <div>
                          <Label className="mb-2 block">Select Dates</Label>
                          <div className="bg-gray-700 p-4 rounded-md">
                            <Calendar
                              mode="multiple"
                              selected={
                                monitor.specific_dates_config?.dates.map(d => new Date(d)) || []
                              }
                              onSelect={(dates) => {
                                if (dates) {
                                  const dateStrings = Array.isArray(dates)
                                    ? dates.map(d => format(d, 'yyyy-MM-dd'))
                                    : [format(dates, 'yyyy-MM-dd')];
                                  
                                  updateMonitor(index, {
                                    schedule_type: 'specific_dates',
                                    specific_dates_config: {
                                      ...monitor.specific_dates_config,
                                      dates: dateStrings,
                                      start_time: monitor.specific_dates_config?.start_time || '09:00',
                                      end_time: monitor.specific_dates_config?.end_time || '17:00',
                                      interval_minutes: monitor.specific_dates_config?.interval_minutes || 15,
                                      max_checks_per_date: monitor.specific_dates_config?.max_checks_per_date || 30
                                    }
                                  });
                                }
                              }}
                              className="rounded-md border-gray-600"
                            />
                          </div>
                          {monitor.specific_dates_config?.dates && monitor.specific_dates_config.dates.length > 0 && (
                            <div className="mt-2">
                              <p className="text-sm text-gray-400 mb-1">Selected dates:</p>
                              <div className="flex flex-wrap gap-2">
                                {monitor.specific_dates_config.dates.map((date) => (
                                  <div key={date} className="flex items-center gap-1 bg-gray-700 px-2 py-1 rounded text-sm">
                                    <CalendarIcon className="w-3 h-3" />
                                    {date}
                                    <button
                                      onClick={() => {
                                        const dates = monitor.specific_dates_config?.dates.filter(d => d !== date) || [];
                                        updateMonitor(index, {
                                          specific_dates_config: {
                                            ...monitor.specific_dates_config!,
                                            dates
                                          }
                                        });
                                      }}
                                      className="ml-1 hover:text-red-400"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Start Time</Label>
                            <Input
                              type="time"
                              value={monitor.specific_dates_config?.start_time || '09:00'}
                              onChange={(e) =>
                                updateMonitor(index, {
                                  schedule_type: 'specific_dates',
                                  specific_dates_config: {
                                    ...monitor.specific_dates_config!,
                                    dates: monitor.specific_dates_config?.dates || [],
                                    start_time: e.target.value,
                                    end_time: monitor.specific_dates_config?.end_time || '17:00',
                                    interval_minutes: monitor.specific_dates_config?.interval_minutes || 15,
                                    max_checks_per_date: monitor.specific_dates_config?.max_checks_per_date || 30
                                  }
                                })
                              }
                              className="bg-gray-700 border-gray-600"
                            />
                          </div>
                          <div>
                            <Label>End Time</Label>
                            <Input
                              type="time"
                              value={monitor.specific_dates_config?.end_time || '17:00'}
                              onChange={(e) =>
                                updateMonitor(index, {
                                  schedule_type: 'specific_dates',
                                  specific_dates_config: {
                                    ...monitor.specific_dates_config!,
                                    dates: monitor.specific_dates_config?.dates || [],
                                    start_time: monitor.specific_dates_config?.start_time || '09:00',
                                    end_time: e.target.value,
                                    interval_minutes: monitor.specific_dates_config?.interval_minutes || 15,
                                    max_checks_per_date: monitor.specific_dates_config?.max_checks_per_date || 30
                                  }
                                })
                              }
                              className="bg-gray-700 border-gray-600"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Check Every (minutes)</Label>
                            <Select
                              value={String(monitor.specific_dates_config?.interval_minutes || 15)}
                              onValueChange={(value) =>
                                updateMonitor(index, {
                                  schedule_type: 'specific_dates',
                                  specific_dates_config: {
                                    ...monitor.specific_dates_config!,
                                    dates: monitor.specific_dates_config?.dates || [],
                                    start_time: monitor.specific_dates_config?.start_time || '09:00',
                                    end_time: monitor.specific_dates_config?.end_time || '17:00',
                                    interval_minutes: parseInt(value),
                                    max_checks_per_date: monitor.specific_dates_config?.max_checks_per_date || 30
                                  }
                                })
                              }
                            >
                              <SelectTrigger className="bg-gray-700 border-gray-600">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">1 minute</SelectItem>
                                <SelectItem value="2">2 minutes</SelectItem>
                                <SelectItem value="5">5 minutes</SelectItem>
                                <SelectItem value="10">10 minutes</SelectItem>
                                <SelectItem value="15">15 minutes</SelectItem>
                                <SelectItem value="30">30 minutes</SelectItem>
                                <SelectItem value="60">60 minutes</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Max Checks Per Date</Label>
                            <Input
                              type="number"
                              value={monitor.specific_dates_config?.max_checks_per_date || 30}
                              onChange={(e) =>
                                updateMonitor(index, {
                                  schedule_type: 'specific_dates',
                                  specific_dates_config: {
                                    ...monitor.specific_dates_config!,
                                    dates: monitor.specific_dates_config?.dates || [],
                                    start_time: monitor.specific_dates_config?.start_time || '09:00',
                                    end_time: monitor.specific_dates_config?.end_time || '17:00',
                                    interval_minutes: monitor.specific_dates_config?.interval_minutes || 15,
                                    max_checks_per_date: parseInt(e.target.value)
                                  }
                                })
                              }
                              className="bg-gray-700 border-gray-600"
                            />
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="hybrid" className="space-y-6">
                        <div className="border border-gray-700 rounded-lg p-4">
                          <h4 className="font-semibold mb-4">Recurring Schedule</h4>
                          <div className="space-y-4">
                            <div>
                              <Label>Days of Week</Label>
                              <div className="grid grid-cols-4 gap-2 mt-2">
                                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(
                                  (day) => (
                                    <div key={day} className="flex items-center space-x-2">
                                      <Checkbox
                                        checked={monitor.recurring_config?.days.includes(day)}
                                        onCheckedChange={(checked) => {
                                          const days = monitor.recurring_config?.days || [];
                                          updateMonitor(index, {
                                            schedule_type: 'hybrid',
                                            recurring_config: {
                                              ...monitor.recurring_config!,
                                              days: checked
                                                ? [...days, day]
                                                : days.filter(d => d !== day)
                                            }
                                          });
                                        }}
                                      />
                                      <Label className="capitalize text-sm">{day.slice(0, 3)}</Label>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Start Time</Label>
                                <Input
                                  type="time"
                                  value={monitor.recurring_config?.start_time || '09:00'}
                                  onChange={(e) =>
                                    updateMonitor(index, {
                                      schedule_type: 'hybrid',
                                      recurring_config: {
                                        ...monitor.recurring_config!,
                                        start_time: e.target.value
                                      }
                                    })
                                  }
                                  className="bg-gray-700 border-gray-600"
                                />
                              </div>
                              <div>
                                <Label>End Time</Label>
                                <Input
                                  type="time"
                                  value={monitor.recurring_config?.end_time || '17:00'}
                                  onChange={(e) =>
                                    updateMonitor(index, {
                                      schedule_type: 'hybrid',
                                      recurring_config: {
                                        ...monitor.recurring_config!,
                                        end_time: e.target.value
                                      }
                                    })
                                  }
                                  className="bg-gray-700 border-gray-600"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Check Every (minutes)</Label>
                                <Select
                                  value={String(monitor.recurring_config?.interval_minutes || 15)}
                                  onValueChange={(value) =>
                                    updateMonitor(index, {
                                      schedule_type: 'hybrid',
                                      recurring_config: {
                                        ...monitor.recurring_config!,
                                        interval_minutes: parseInt(value)
                                      }
                                    })
                                  }
                                >
                                  <SelectTrigger className="bg-gray-700 border-gray-600">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="1">1 minute</SelectItem>
                                    <SelectItem value="5">5 minutes</SelectItem>
                                    <SelectItem value="15">15 minutes</SelectItem>
                                    <SelectItem value="30">30 minutes</SelectItem>
                                    <SelectItem value="60">60 minutes</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label>Max Checks Per Day</Label>
                                <Input
                                  type="number"
                                  value={monitor.recurring_config?.max_checks_per_day || 30}
                                  onChange={(e) =>
                                    updateMonitor(index, {
                                      schedule_type: 'hybrid',
                                      recurring_config: {
                                        ...monitor.recurring_config!,
                                        max_checks_per_day: parseInt(e.target.value)
                                      }
                                    })
                                  }
                                  className="bg-gray-700 border-gray-600"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="border border-gray-700 rounded-lg p-4">
                          <h4 className="font-semibold mb-4">Specific Dates (Additional)</h4>
                          <div className="space-y-4">
                            <div>
                              <Label className="mb-2 block">Select Dates</Label>
                              <div className="bg-gray-700 p-4 rounded-md">
                                <Calendar
                                  mode="multiple"
                                  selected={
                                    monitor.specific_dates_config?.dates.map(d => new Date(d)) || []
                                  }
                                  onSelect={(dates) => {
                                    if (dates) {
                                      const dateStrings = Array.isArray(dates)
                                        ? dates.map(d => format(d, 'yyyy-MM-dd'))
                                        : [format(dates, 'yyyy-MM-dd')];
                                      
                                      updateMonitor(index, {
                                        schedule_type: 'hybrid',
                                        specific_dates_config: {
                                          ...monitor.specific_dates_config,
                                          dates: dateStrings,
                                          start_time: monitor.specific_dates_config?.start_time || '09:00',
                                          end_time: monitor.specific_dates_config?.end_time || '17:00',
                                          interval_minutes: monitor.specific_dates_config?.interval_minutes || 15,
                                          max_checks_per_date: monitor.specific_dates_config?.max_checks_per_date || 30
                                        }
                                      });
                                    }
                                  }}
                                  className="rounded-md border-gray-600"
                                />
                              </div>
                              {monitor.specific_dates_config?.dates && monitor.specific_dates_config.dates.length > 0 && (
                                <div className="mt-2">
                                  <div className="flex flex-wrap gap-2">
                                    {monitor.specific_dates_config.dates.map((date) => (
                                      <div key={date} className="flex items-center gap-1 bg-gray-700 px-2 py-1 rounded text-sm">
                                        <CalendarIcon className="w-3 h-3" />
                                        {date}
                                        <button
                                          onClick={() => {
                                            const dates = monitor.specific_dates_config?.dates.filter(d => d !== date) || [];
                                            updateMonitor(index, {
                                              specific_dates_config: {
                                                ...monitor.specific_dates_config!,
                                                dates
                                              }
                                            });
                                          }}
                                          className="ml-1 hover:text-red-400"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Start Time</Label>
                                <Input
                                  type="time"
                                  value={monitor.specific_dates_config?.start_time || '09:00'}
                                  onChange={(e) =>
                                    updateMonitor(index, {
                                      schedule_type: 'hybrid',
                                      specific_dates_config: {
                                        ...monitor.specific_dates_config!,
                                        dates: monitor.specific_dates_config?.dates || [],
                                        start_time: e.target.value,
                                        end_time: monitor.specific_dates_config?.end_time || '17:00',
                                        interval_minutes: monitor.specific_dates_config?.interval_minutes || 15,
                                        max_checks_per_date: monitor.specific_dates_config?.max_checks_per_date || 30
                                      }
                                    })
                                  }
                                  className="bg-gray-700 border-gray-600"
                                />
                              </div>
                              <div>
                                <Label>End Time</Label>
                                <Input
                                  type="time"
                                  value={monitor.specific_dates_config?.end_time || '17:00'}
                                  onChange={(e) =>
                                    updateMonitor(index, {
                                      schedule_type: 'hybrid',
                                      specific_dates_config: {
                                        ...monitor.specific_dates_config!,
                                        dates: monitor.specific_dates_config?.dates || [],
                                        start_time: monitor.specific_dates_config?.start_time || '09:00',
                                        end_time: e.target.value,
                                        interval_minutes: monitor.specific_dates_config?.interval_minutes || 15,
                                        max_checks_per_date: monitor.specific_dates_config?.max_checks_per_date || 30
                                      }
                                    })
                                  }
                                  className="bg-gray-700 border-gray-600"
                                />
                              </div>
                            </div>

                            <div>
                              <Label>Max Checks Per Date</Label>
                              <Input
                                type="number"
                                value={monitor.specific_dates_config?.max_checks_per_date || 30}
                                onChange={(e) =>
                                  updateMonitor(index, {
                                    schedule_type: 'hybrid',
                                    specific_dates_config: {
                                      ...monitor.specific_dates_config!,
                                      dates: monitor.specific_dates_config?.dates || [],
                                      start_time: monitor.specific_dates_config?.start_time || '09:00',
                                      end_time: monitor.specific_dates_config?.end_time || '17:00',
                                      interval_minutes: monitor.specific_dates_config?.interval_minutes || 15,
                                      max_checks_per_date: parseInt(e.target.value)
                                    }
                                  })
                                }
                                className="bg-gray-700 border-gray-600"
                              />
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>

                    <div>
                      <Label>Stop Checking After Response</Label>
                      <Select
                        value={monitor.stop_after_response}
                        onValueChange={(value) =>
                          updateMonitor(index, {
                            stop_after_response: value as typeof monitor.stop_after_response
                          })
                        }
                      >
                        <SelectTrigger className="bg-gray-700 border-gray-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="never">Never stop</SelectItem>
                          <SelectItem value="rest_of_day">Rest of day</SelectItem>
                          <SelectItem value="rest_of_window">Rest of window</SelectItem>
                          <SelectItem value="next_period">Next period</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Button onClick={addMonitor} variant="outline" className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Email Monitor
            </Button>
          </CardContent>
        </Card>

        {/* AI Prompt Configuration */}
        <Card className="bg-gray-900 border-gray-800 mb-8">
          <CardHeader>
            <CardTitle>AI Response Configuration</CardTitle>
            <CardDescription>
              Customize the AI prompt. Available variables: {'{SENDER_NAME}'}, {'{SENDER_EMAIL}'},{' '}
              {'{EMAIL_SUBJECT}'}, {'{EMAIL_CONTENT}'}, {'{CALENDAR_EVENTS}'}, {'{CURRENT_DATE}'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              className="bg-gray-700 border-gray-600 min-h-[200px] font-mono text-sm"
            />
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex gap-4">
          <Button onClick={saveConfiguration} disabled={isSaving} size="lg" className="flex-1">
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </div>
    </div>
  );
}
