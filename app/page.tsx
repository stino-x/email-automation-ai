import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Calendar, Brain, Zap, Shield, Clock } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-linear-to-b from-gray-900 to-gray-950 text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold mb-6 bg-linear-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            AI-Powered Email Automation
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            Monitor emails 24/7, generate intelligent responses with AI, and never miss important messages.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg">Get Started Free</Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">Sign In</Button>
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-20">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <Clock className="w-10 h-10 mb-2 text-blue-400" />
              <CardTitle>Flexible Scheduling</CardTitle>
              <CardDescription className="text-gray-400">
                Set recurring schedules, specific dates, or hybrid patterns.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <Brain className="w-10 h-10 mb-2 text-purple-400" />
              <CardTitle>AI-Powered Responses</CardTitle>
              <CardDescription className="text-gray-400">
                Groq AI generates professional responses with custom prompts.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <Calendar className="w-10 h-10 mb-2 text-green-400" />
              <CardTitle>Calendar Integration</CardTitle>
              <CardDescription className="text-gray-400">
                Includes Google Calendar availability in responses.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <Mail className="w-10 h-10 mb-2 text-red-400" />
              <CardTitle>Gmail Integration</CardTitle>
              <CardDescription className="text-gray-400">
                Read, filter, and respond to emails automatically.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <Zap className="w-10 h-10 mb-2 text-yellow-400" />
              <CardTitle>Smart Check Limits</CardTitle>
              <CardDescription className="text-gray-400">
                Track progress and prevent over-checking with limits.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <Shield className="w-10 h-10 mb-2 text-cyan-400" />
              <CardTitle>Secure & Private</CardTitle>
              <CardDescription className="text-gray-400">
                Row-level security, encrypted tokens, OAuth 2.0.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <div className="mt-20 text-center">
          <Link href="/dashboard">
            <Button size="lg">Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}