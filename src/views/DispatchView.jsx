import React from 'react'
import { Send, Clock, RefreshCw, Bell } from 'lucide-react'
import PlaceholderView from '../components/PlaceholderView.jsx'

const features = [
  { icon: <Clock size={18} />, title: 'Scheduled tasks', desc: 'Run prompts on a schedule — daily briefings, weekly reports' },
  { icon: <RefreshCw size={18} />, title: 'Automations', desc: 'Trigger Claude workflows from events in your connected apps' },
  { icon: <Bell size={18} />, title: 'Notifications', desc: 'Get alerts when tasks complete or conditions are met' },
]

export default function DispatchView() {
  return (
    <PlaceholderView
      icon={<Send size={32} />}
      title="Dispatch"
      subtitle="Run Claude tasks automatically — on schedules or triggers"
      features={features}
      accent="#e09a4b"
    />
  )
}
