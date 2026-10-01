import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, Users, TentTree, Cake } from 'lucide-react';

interface CalendarEvent {
  id: number;
  title: string;
  start: string | Date;
  end: string | Date;
  type: 'meeting' | 'holiday' | 'leave' | 'birthday';
  allDay?: boolean;
  color: string;
  status?: string;
  avatar?: string;
}

interface CalendarProps {
  events: CalendarEvent[];
  canManage: boolean;
}

export default function CalendarIndex({ events, canManage }: CalendarProps) {
  const { t } = useTranslation();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Calendar') }
  ];

  const handleEventClick = (clickInfo: any) => {
    const event = events.find(e => String(e.id) === String(clickInfo.event.id));
    if (event) {
      setSelectedEvent(event);
      setIsDialogOpen(true);
      // close the +more popover
      clickInfo.jsEvent?.target?.closest('.fc-popover')?.querySelector<HTMLElement>('.fc-popover-close')?.click();
    }
  };

  const currentMonth = viewDate.getMonth();
  const currentYear = viewDate.getFullYear();
  const monthEvents = events.filter(e => {
    const d = new Date(e.start);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const upcomingEvents = [...events]
    .filter(e => new Date(e.start) >= new Date())
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const typeIcon = (type: string) => {
    if (type === 'meeting') return <Users className="h-4 w-4" />;
    if (type === 'holiday') return <TentTree className="h-4 w-4" />;
    if (type === 'birthday') return <Cake className="h-4 w-4" />;
    return <Clock className="h-4 w-4" />;
  };

  const typeIconBoxClass = (type: string) => {
    if (type === 'meeting') return 'bg-blue-200 text-blue-700';
    if (type === 'holiday') return 'bg-green-200 text-green-700';
    if (type === 'birthday') return 'bg-pink-200 text-pink-700';
    return 'bg-yellow-100  text-yellow-700';
  };

  return (
    <PageTemplate
      title={t('Calendar')}
      description={t('View your scheduled events and activities.')}
      url="/calendar"
      breadcrumbs={breadcrumbs}
    >
        <style>
            {`
            .fc .fc-event-title {
                font-size: 0.75rem;
            }
            .fc .fc-daygrid-event-harness {
                margin-bottom: 3px !important;
            }
            .fc .fc-popover-body {
                max-height: 130px;
                overflow-y: auto;
            }
            `}
        </style>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Calendar */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-200 dark:border-gray-700">
            {/* Legend */}
            <div className="flex items-center gap-4 px-5 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('Legend')}:</span>
              <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-700" />
                {t('Meetings')}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                <div className="w-2.5 h-2.5 rounded-full bg-green-700" />
                {t('Holidays')}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-700" />
                {t('Leaves')}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                <div className="w-2.5 h-2.5 rounded-full bg-pink-600" />
                {t('Birthdays')}
              </div>
            </div>

            <div className="p-4" style={{ height: '800px' }}>
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
                }}
                events={events}
                height="100%"
                editable={canManage}
                selectable={canManage}
                selectMirror={true}
                dayMaxEvents={true}
                weekends={true}
                eventDisplay="block"
                eventBackgroundColor=""
                eventBorderColor=""
                eventClick={handleEventClick}
                datesSet={(info) => setViewDate(info.view.currentStart)}
                displayEventTime={false}
            />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Upcoming Events */}
          <Card className="border border-gray-200 dark:border-gray-700 shadow-sm">
            <CardHeader className="pb-3 pt-4 px-4 border-b border-gray-100 dark:border-gray-800">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                {t('Upcoming Events')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 max-h-80 overflow-x-auto">
              {upcomingEvents.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 px-4 py-6 text-center">{t('No upcoming events')}</p>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {upcomingEvents.map((event) => (
                    <div
                      key={event.id}
                      onClick={() => { setSelectedEvent(event); setIsDialogOpen(true); }}
                      className="flex items-start gap-3 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/60 cursor-pointer transition-colors"
                    >
                      <div className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"/>
                      {(event.type === 'leave' || event.type === 'birthday') && event.avatar ? (
                        <img src={event.avatar} alt={event.title} className="h-10 w-10 flex-shrink-0 rounded-lg object-cover" />
                      ) : (
                        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${typeIconBoxClass(event.type)}`}>
                          {typeIcon(event.type)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{event.title}</p>
                        <p className="flex gap-1 items-center text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            <Calendar className='h-3 w-3' />
                            {window.appSettings?.formatDateTimeSimple(String(event.start), false)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="border border-gray-200 dark:border-gray-700 shadow-sm">
            <CardHeader className="pb-3 pt-4 px-4 border-b border-gray-100 dark:border-gray-800">
              <CardTitle className="text-sm font-semibold">{t('This Month')}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 py-3 space-y-2">
              {[
                  { label: t('Meetings'), count: monthEvents.filter(e => e.type === 'meeting').length, color: 'text-blue-600 dark:text-blue-400' },
                  { label: t('Holidays'), count: monthEvents.filter(e => e.type === 'holiday').length, color: 'text-green-600 dark:text-green-400' },
                  { label: t('Leaves'), count: monthEvents.filter(e => e.type === 'leave').length, color: 'text-yellow-600 dark:text-yellow-400' },
                  { label: t('Birthdays'), count: monthEvents.filter(e => e.type === 'birthday').length, color: 'text-pink-600 dark:text-pink-400' },
                  { label: t('Total Events'), count: monthEvents.length, color: 'text-gray-700 dark:text-gray-300' },
              ].map(({ label, count, color }) => (
                <div key={label} className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{label}</span>
                  <span className={`font-semibold ${color}`}>{count}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedEvent?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`
                ${selectedEvent?.type === 'meeting' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
                ${selectedEvent?.type === 'holiday' ? 'bg-green-50 text-green-700 border-green-200' : ''}
                ${selectedEvent?.type === 'leave' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : ''}
                ${selectedEvent?.type === 'birthday' ? 'bg-pink-50 text-pink-700 border-pink-200' : ''}
              `}>
                {selectedEvent?.type === 'meeting' && t('Meeting')}
                {selectedEvent?.type === 'holiday' && t('Holiday')}
                {selectedEvent?.type === 'leave' && t('Leave')}
                {selectedEvent?.type === 'birthday' && t('Birthday')}
              </Badge>
              {selectedEvent?.status && (
                <Badge variant="outline">{selectedEvent.status}</Badge>
              )}
            </div>
            {!selectedEvent?.allDay &&
            <><div>
              <p className="text-sm text-muted-foreground">{t('Start Date')}</p>
              <p className="font-medium">
                <div className="flex items-center gap-2 whitespace-nowrap overflow-hidden text-ellipsis text-gray-500">
                    {selectedEvent?.start && <Calendar className="h-4 w-4" />}
                    <span>{selectedEvent?.start ? window.appSettings.formatDateTime(selectedEvent?.start) : ''}</span>
                </div>
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('End Date')}</p>
              <p className="font-medium">
                <div className="flex items-center gap-2 whitespace-nowrap overflow-hidden text-ellipsis text-gray-500">
                    {selectedEvent?.end && <Calendar className="h-4 w-4" />}
                    <span>{selectedEvent?.end ? window.appSettings.formatDateTime(selectedEvent?.end) : ''}</span>
                </div>
              </p>
            </div>
            </>}
            {selectedEvent?.allDay && (
              <div>
                <Badge variant="outline">{t('All Day Event')}</Badge>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </PageTemplate>
  );
}
