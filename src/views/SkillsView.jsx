import React from 'react'
import { Zap, FileSpreadsheet, Presentation, Image, FileCode } from 'lucide-react'
import PlaceholderView from '../components/PlaceholderView.jsx'

const features = [
  { icon: <FileSpreadsheet size={18} />, title: 'Excel & Sheets', desc: 'Create, edit, and analyze spreadsheets with formulas and charts' },
  { icon: <Presentation size={18} />, title: 'Presentations', desc: 'Build polished slide decks from your content automatically' },
  { icon: <Image size={18} />, title: 'Image generation', desc: 'Create visuals, diagrams, and artwork on demand' },
  { icon: <FileCode size={18} />, title: 'Custom skills', desc: 'Install community skills or build your own automations' },
]

export default function SkillsView() {
  return (
    <PlaceholderView
      icon={<Zap size={32} />}
      title="Skills"
      subtitle="Extend Claude with specialized capabilities and tools"
      features={features}
      accent="#4caf81"
    />
  )
}
