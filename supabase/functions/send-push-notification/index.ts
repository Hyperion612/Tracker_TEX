import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { webpush } from 'https://deno.land/x/web_push@v1.0.0/mod.ts'

serve(async (req) => {
  try {
    const { user_id, title, body, url } = await req.json()

    // Создаем Supabase клиент
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Получаем настройки уведомлений
    const { data: settings } = await supabase
      .from('notification_settings')
      .select('push_enabled, vapid_private_key')
      .eq('user_id', user_id)
      .single()

    if (!settings?.push_enabled) {
      return new Response(JSON.stringify({ message: 'Push notifications disabled' }), { status: 200 })
    }

    // Получаем подписки пользователя
    const { data: subscriptions } = await supabase
      .rpc('get_push_subscriptions_for_user', { p_user_id: user_id })

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ message: 'No push subscriptions found' }), { status: 200 })
    }

    // Отправляем push-уведомления
    const vapidDetails = {
      subject: 'mailto:notification@tracker.app',
      privateKey: settings.vapid_private_key || Deno.env.get('VAPID_PRIVATE_KEY') || '',
    }

    let successCount = 0
    let failCount = 0

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys,
          },
          JSON.stringify({
            title: title || 'Трекер посещаемости',
            body: body || 'Новое уведомление',
            url: url || '/',
            icon: '/favicon.ico',
          }),
          {
            vapidDetails,
            TTL: 86400, // 24 часа
          }
        )
        successCount++
      } catch (error) {
        console.error('Error sending push notification:', error)
        failCount++
        
        // Если подписка недействительна, удаляем её
        if (error.statusCode === 410) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', sub.endpoint)
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount, 
        failed: failCount 
      }), 
      { status: 200 }
    )
  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
