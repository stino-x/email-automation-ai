import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET() {
  try {
    // Test if multiple Google accounts are supported
    const { error: tokenError } = await supabase
      .from('google_tokens')
      .select('*')
      .limit(1);

    // Test if calendar_id column exists in configurations
    const { error: configError } = await supabase
      .from('configurations')
      .select('calendar_id')
      .limit(1);

    const migrationsStatus = {
      multiple_google_accounts: !tokenError,
      calendar_configuration: !configError,
      ready: !tokenError && !configError
    };

    if (migrationsStatus.ready) {
      return NextResponse.json({
        success: true,
        message: 'All required migrations are applied',
        migrations: migrationsStatus
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Database migrations required',
        migrations: migrationsStatus,
        errors: {
          google_tokens: tokenError?.message,
          configurations: configError?.message
        }
      }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Failed to check migration status',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}