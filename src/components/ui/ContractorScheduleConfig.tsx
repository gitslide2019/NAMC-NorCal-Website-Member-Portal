'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useContractorScheduling } from '@/hooks/useContractorScheduling';

interface WorkingHours {
  start: string;
  end: string;
  enabled: boolean;
}

interface WorkingHoursConfig {
  monday: WorkingHours;
  tuesday: WorkingHours;
  wednesday: WorkingHours;
  thursday: WorkingHours;
  friday: WorkingHours;
  saturday: WorkingHours;
  sunday: WorkingHours;
}

const defaultWorkingHours: WorkingHoursConfig = {
  monday: { start: '09:00', end: '17:00', enabled: true },
  tuesday: { start: '09:00', end: '17:00', enabled: true },
  wednesday: { start: '09:00', end: '17:00', enabled: true },
  thursday: { start: '09:00', end: '17:00', enabled: true },
  friday: { start: '09:00', end: '17:00', enabled: true },
  saturday: { start: '09:00', end: '15:00', enabled: false },
  sunday: { start: '10:00', end: '14:00', enabled: false },
};

const dayNames = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

export function ContractorScheduleConfig() {
  const { 
    schedule, 
    createSchedule, 
    updateSchedule, 
    loading, 
    error 
  } = useContractorScheduling();

  const [workingHours, setWorkingHours] = useState<WorkingHoursConfig>(defaultWorkingHours);
  const [timezone, setTimezone] = useState('America/Los_Angeles');
  const [bufferTime, setBufferTime] = useState(15);
  const [advanceBookingDays, setAdvanceBookingDays] = useState(30);
  const [minimumNoticeHours, setMinimumNoticeHours] = useState(24);
  const [isAcceptingBookings, setIsAcceptingBookings] = useState(true);
  const [autoConfirmBookings, setAutoConfirmBookings] = useState(false);
  const [requiresDeposit, setRequiresDeposit] = useState(true);
  const [depositPercentage, setDepositPercentage] = useState(25);

  // Load existing schedule data
  useEffect(() => {
    if (schedule) {
      setWorkingHours(schedule.workingHours);
      setTimezone(schedule.timezone);
      setBufferTime(schedule.bufferTime);
      setAdvanceBookingDays(schedule.advanceBookingDays);
      setMinimumNoticeHours(schedule.minimumNoticeHours);
      setIsAcceptingBookings(schedule.isAcceptingBookings);
      setAutoConfirmBookings(schedule.autoConfirmBookings);
      setRequiresDeposit(schedule.requiresDeposit);
      setDepositPercentage(schedule.depositPercentage);
    }
  }, [schedule]);

  const handleWorkingHoursChange = (day: keyof WorkingHoursConfig, field: keyof WorkingHours, value: string | boolean) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    try {
      const scheduleData = {
        timezone,
        workingHours,
        bufferTime,
        advanceBookingDays,
        minimumNoticeHours,
        isAcceptingBookings,
        autoConfirmBookings,
        requiresDeposit,
        depositPercentage,
        cancellationPolicy: {
          allowCancellation: true,
          cancellationDeadlineHours: 24,
          refundPolicy: 'PARTIAL' as const,
          partialRefundPercentage: 50
        }
      };

      if (schedule) {
        await updateSchedule(scheduleData);
      } else {
        await createSchedule(scheduleData);
      }
    } catch (err) {
      console.error('Error saving schedule:', err);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Schedule Configuration</h2>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Basic Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="America/Los_Angeles">Pacific Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/New_York">Eastern Time</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buffer Time (minutes)
              </label>
              <Input
                type="number"
                value={bufferTime}
                onChange={(e) => setBufferTime(parseInt(e.target.value) || 0)}
                min="0"
                max="60"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Advance Booking Days
              </label>
              <Input
                type="number"
                value={advanceBookingDays}
                onChange={(e) => setAdvanceBookingDays(parseInt(e.target.value) || 0)}
                min="1"
                max="365"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Notice Hours
              </label>
              <Input
                type="number"
                value={minimumNoticeHours}
                onChange={(e) => setMinimumNoticeHours(parseInt(e.target.value) || 0)}
                min="1"
                max="168"
              />
            </div>
          </div>

          {/* Booking Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Booking Settings</h3>
            
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isAcceptingBookings}
                  onChange={(e) => setIsAcceptingBookings(e.target.checked)}
                  className="mr-2"
                />
                Accept new bookings
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={autoConfirmBookings}
                  onChange={(e) => setAutoConfirmBookings(e.target.checked)}
                  className="mr-2"
                />
                Auto-confirm bookings
              </label>
            </div>

            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={requiresDeposit}
                  onChange={(e) => setRequiresDeposit(e.target.checked)}
                  className="mr-2"
                />
                Require deposit
              </label>

              {requiresDeposit && (
                <div className="flex items-center space-x-2">
                  <span>Deposit:</span>
                  <Input
                    type="number"
                    value={depositPercentage}
                    onChange={(e) => setDepositPercentage(parseFloat(e.target.value) || 0)}
                    min="0"
                    max="100"
                    className="w-20"
                  />
                  <span>%</span>
                </div>
              )}
            </div>
          </div>

          {/* Working Hours */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Working Hours</h3>
            
            <div className="space-y-3">
              {Object.entries(dayNames).map(([day, displayName]) => (
                <div key={day} className="flex items-center space-x-4">
                  <div className="w-24">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={workingHours[day as keyof WorkingHoursConfig].enabled}
                        onChange={(e) => handleWorkingHoursChange(day as keyof WorkingHoursConfig, 'enabled', e.target.checked)}
                        className="mr-2"
                      />
                      {displayName}
                    </label>
                  </div>

                  {workingHours[day as keyof WorkingHoursConfig].enabled && (
                    <>
                      <div className="flex items-center space-x-2">
                        <span>From:</span>
                        <Input
                          type="time"
                          value={workingHours[day as keyof WorkingHoursConfig].start}
                          onChange={(e) => handleWorkingHoursChange(day as keyof WorkingHoursConfig, 'start', e.target.value)}
                          className="w-32"
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <span>To:</span>
                        <Input
                          type="time"
                          value={workingHours[day as keyof WorkingHoursConfig].end}
                          onChange={(e) => handleWorkingHoursChange(day as keyof WorkingHoursConfig, 'end', e.target.value)}
                          className="w-32"
                        />
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-2"
            >
              {loading ? 'Saving...' : schedule ? 'Update Schedule' : 'Create Schedule'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}