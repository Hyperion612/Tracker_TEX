import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  try {
    const { type, user_id } = await req.json()

    // Создаем Supabase клиент
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Получаем пользователя
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', user_id)
      .single()

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 })
    }

    // Получаем настройки уведомлений
    const { data: settings } = await supabase
      .from('notification_settings')
      .select('email_enabled, email_reminder_hours_before')
      .eq('user_id', user_id)
      .single()

    if (!settings?.email_enabled) {
      return new Response(JSON.stringify({ message: 'Email notifications disabled' }), { status: 200 })
    }

    let subject = ''
    let body = ''

    if (type === 'homework_reminder') {
      // Получаем домашние задания на завтра
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowStr = tomorrow.toISOString().split('T')[0]

      const { data: homework } = await supabase
        .from('homework')
        .select('subject, description, due_date')
        .eq('user_id', user_id)
        .eq('due_date', tomorrowStr)
        .eq('status', 'pending')

      if (!homework || homework.length === 0) {
        return new Response(JSON.stringify({ message: 'No homework due tomorrow' }), { status: 200 })
      }

      subject = `📚 Напоминание о домашнем задании на ${tomorrow.toLocaleDateString('ru-RU')}`
      body = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1E3A8A;">Здравствуйте, ${user.full_name}!</h2>
          <p>Напоминаем о домашних заданиях на завтра:</p>
          <ul>
            ${homework.map(hw => `
              <li style="margin: 10px 0;">
                <strong>${hw.subject}</strong><br/>
                <span style="color: #666;">${hw.description}</span>
              </li>
            `).join('')}
          </ul>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            Это автоматическое уведомление от Трекера посещаемости техникума.
          </p>
        </div>
      `
    } else if (type === 'schedule_reminder') {
      // Получаем пары на завтра
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const dayOfWeek = tomorrow.getDay() === 0 ? 7 : tomorrow.getDay()

      const { data: schedule } = await supabase
        .from('schedule')
        .select('subject, start_time, end_time, teacher, room')
        .eq('user_id', user_id)
        .eq('day_of_week', dayOfWeek)
        .order('start_time')

      if (!schedule || schedule.length === 0) {
        return new Response(JSON.stringify({ message: 'No classes tomorrow' }), { status: 200 })
      }

      subject = `📅 Расписание на ${tomorrow.toLocaleDateString('ru-RU')}`
      body = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1E3A8A;">Здравствуйте, ${user.full_name}!</h2>
          <p>Ваше расписание на завтра:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background: #F8FAFC;">
                <th style="padding: 10px; text-align: left; border: 1px solid #E2E8F0;">Время</th>
                <th style="padding: 10px; text-align: left; border: 1px solid #E2E8F0;">Предмет</th>
                <th style="padding: 10px; text-align: left; border: 1px solid #E2E8F0;">Преподаватель</th>
                <th style="padding: 10px; text-align: left; border: 1px solid #E2E8F0;">Аудитория</th>
              </tr>
            </thead>
            <tbody>
              ${schedule.map(cls => `
                <tr>
                  <td style="padding: 10px; border: 1px solid #E2E8F0;">${cls.start_time} - ${cls.end_time}</td>
                  <td style="padding: 10px; border: 1px solid #E2E8F0;">${cls.subject}</td>
                  <td style="padding: 10px; border: 1px solid #E2E8F0;">${cls.teacher || '-'}</td>
                  <td style="padding: 10px; border: 1px solid #E2E8F0;">${cls.room || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            Это автоматическое уведомление от Трекера посещаемости техникума.
          </p>
        </div>
      `
    } else if (type === 'overdue_homework') {
      // Получаем просроченные домашние задания
      const today = new Date().toISOString().split('T')[0]

      const { data: overdue } = await supabase
        .from('homework')
        .select('subject, description, due_date')
        .eq('user_id', user_id)
        .lt('due_date', today)
        .eq('status', 'pending')

      if (!overdue || overdue.length === 0) {
        return new Response(JSON.stringify({ message: 'No overdue homework' }), { status: 200 })
      }

      subject = `⚠️ У вас есть просроченные домашние задания`
      body = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #DC2626;">Здравствуйте, ${user.full_name}!</h2>
          <p>У вас есть просроченные домашние задания:</p>
          <ul>
            ${overdue.map(hw => `
              <li style="margin: 10px 0;">
                <strong>${hw.subject}</strong><br/>
                <span style="color: #666;">${hw.description}</span><br/>
                <span style="color: #DC2626; font-size: 12px;">Срок: ${new Date(hw.due_date).toLocaleDateString('ru-RU')}</span>
              </li>
            `).join('')}
          </ul>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            Это автоматическое уведомление от Трекера посещаемости техникума.
          </p>
        </div>
      `
    } else {
      return new Response(JSON.stringify({ error: 'Unknown notification type' }), { status: 400 })
    }

    // Отправляем email через Resend
    if (RESEND_API_KEY) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'Трекер посещаемости <onboarding@resend.dev>',
          to: [user.email],
          subject,
          html: body,
        }),
      })

      if (!res.ok) {
        const error = await res.text()
        console.error('Resend error:', error)
        return new Response(JSON.stringify({ error: 'Failed to send email' }), { status: 500 })
      }
    }

    // Сохраняем в очередь email
    await supabase.from('email_queue').insert({
      user_id,
      to_email: user.email,
      subject,
      body,
      status: 'sent',
      sent_at: new Date().toISOString(),
    })

    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
