'use client'

import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'

interface FitMetric {
  id: string
  date: string
  steps: number
  distance_meters: number
  calories_burned: number
  active_minutes: number
}

interface TimelineProps {
  metrics: FitMetric[]
  isLoading: boolean
}

interface ChartDataPoint {
  date: string
  formattedDate: string
  steps: number
  calories: number
  activeMinutes: number
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
}

export default function Timeline({ metrics, isLoading }: TimelineProps) {
  // Prepare data for charts - sort by date ascending for proper line rendering
  const chartData: ChartDataPoint[] = useMemo(() => {
    return [...metrics]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(metric => ({
        date: metric.date,
        formattedDate: new Date(metric.date).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        }),
        steps: metric.steps,
        calories: metric.calories_burned,
        activeMinutes: metric.active_minutes
      }))
  }, [metrics])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse bg-gray-200 h-64 rounded-lg"></div>
        <div className="animate-pulse bg-gray-200 h-64 rounded-lg"></div>
        <div className="animate-pulse bg-gray-200 h-64 rounded-lg"></div>
      </div>
    )
  }

  if (chartData.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-lg">📊</div>
        <p className="text-gray-500 mt-2">No fitness data to visualize</p>
        <p className="text-sm text-gray-400">Connect and sync Google Fit to see your activity charts</p>
      </div>
    )
  }

  // Check if all data is zeros
  const hasAnyData = chartData.some(d => d.steps > 0 || d.calories > 0 || d.activeMinutes > 0)
  
  if (!hasAnyData) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-lg">📊</div>
        <p className="text-gray-500 mt-2">Charts synced but no activity data found</p>
        <p className="text-sm text-gray-400">
          This could mean:<br/>
          • No recorded activity in the last 7 days<br/>
          • Google Fit permissions need adjustment<br/>
          • Your device isn't tracking fitness data
        </p>
        <p className="text-xs text-gray-400 mt-2">
          Check your Google Fit app to ensure data is being recorded
        </p>
      </div>
    )
  }

  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-8">
      {/* Steps Chart */}
      <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-2xl shadow-sm hover:shadow-lg transition-shadow duration-300 border border-blue-200">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <h3 className="text-lg font-medium text-gray-900">Daily Steps</h3>
        </div>
        <div className="aspect-w-2 aspect-h-1" style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="formattedDate" 
                fontSize={12}
                tick={{ fill: '#6B7280' }}
              />
              <YAxis 
                fontSize={12}
                tick={{ fill: '#6B7280' }}
                tickFormatter={(value) => value.toLocaleString()}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="steps" 
                stroke="#3B82F6" 
                strokeWidth={2}
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                name="Steps"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Calories Chart */}
      <div className="bg-gradient-to-br from-red-50 to-white p-6 rounded-2xl shadow-sm hover:shadow-lg transition-shadow duration-300 border border-red-200">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <h3 className="text-lg font-medium text-gray-900">Calories Burned</h3>
        </div>
        <div className="aspect-w-2 aspect-h-1" style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="formattedDate" 
                fontSize={12}
                tick={{ fill: '#6B7280' }}
              />
              <YAxis 
                fontSize={12}
                tick={{ fill: '#6B7280' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="calories" 
                stroke="#EF4444" 
                strokeWidth={2}
                dot={{ fill: '#EF4444', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                name="Calories"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Active Minutes Chart */}
      <div className="bg-gradient-to-br from-green-50 to-white p-6 rounded-2xl shadow-sm hover:shadow-lg transition-shadow duration-300 border border-green-200">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <h3 className="text-lg font-medium text-gray-900">Active Minutes</h3>
        </div>
        <div className="aspect-w-2 aspect-h-1" style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="formattedDate" 
                fontSize={12}
                tick={{ fill: '#6B7280' }}
              />
              <YAxis 
                fontSize={12}
                tick={{ fill: '#6B7280' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="activeMinutes" 
                stroke="#10B981" 
                strokeWidth={2}
                dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                name="Active Minutes"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
} 