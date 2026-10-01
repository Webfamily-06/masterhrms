import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from 'react-i18next';
import { MapPin, Monitor, Users, Lock, FileText, Hash, Link, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from '@/components/custom-toast';

interface ViewMeetingRoomProps {
    meetingRoom: any;
}

export default function View({ meetingRoom }: ViewMeetingRoomProps) {
    const { t } = useTranslation();
    const [copiedLink, setCopiedLink] = useState(false);

    const handleCopyLink = () => {
        if (meetingRoom.booking_url) {
            navigator.clipboard.writeText(meetingRoom.booking_url);
            setCopiedLink(true);
            toast.success(t('Link copied to clipboard'));
            setTimeout(() => setCopiedLink(false), 2000);
        }
    };

    return (
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
            {/* Colored Header Banner */}
            <div className={`px-6 pt-6 pb-4 border-b ${
                meetingRoom.type === 'Virtual' 
                    ? 'bg-blue-50 dark:bg-blue-900/20' 
                    : 'bg-green-50 dark:bg-green-900/20'
            }`}>
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                        meetingRoom.type === 'Virtual' 
                            ? 'bg-blue-100 dark:bg-blue-900' 
                            : 'bg-green-100 dark:bg-green-900'
                    }`}>
                        {meetingRoom.type === 'Virtual' ? (
                            <Monitor className={`h-5 w-5 ${
                                meetingRoom.type === 'Virtual' 
                                    ? 'text-blue-700 dark:text-blue-300' 
                                    : 'text-green-700 dark:text-green-300'
                            }`} />
                        ) : (
                            <MapPin className={`h-5 w-5 ${
                                meetingRoom.type === 'Virtual' 
                                    ? 'text-blue-700 dark:text-blue-300' 
                                    : 'text-green-700 dark:text-green-300'
                            }`} />
                        )}
                    </div>
                    <div>
                        <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
                            {meetingRoom.name}
                        </DialogTitle>
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset mt-1 ${
                            meetingRoom.type === 'Virtual' 
                                ? 'bg-blue-100 text-blue-700 ring-blue-600/20 dark:bg-blue-900/30 dark:text-blue-300' 
                                : 'bg-green-100 text-green-700 ring-green-600/20 dark:bg-green-900/30 dark:text-green-300'
                        }`}>
                            {meetingRoom.type}
                        </span>
                    </div>
                </div>
            </div>

            <div className="px-6 py-6 space-y-6">
                {/* Basic Info Section */}
                <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('Basic Info')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                <Lock className="h-4 w-4" />
                                {t('Status')}
                            </label>
                            <p className="mt-1">
                                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                                    meetingRoom.status === 'active' 
                                        ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20 dark:bg-green-900/30 dark:text-green-300' 
                                        : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20 dark:bg-red-900/30 dark:text-red-300'
                                }`}>
                                    {meetingRoom.status === 'active' ? t('Active') : t('Inactive')}
                                </span>
                            </p>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                {t('Capacity')}
                            </label>
                            <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{meetingRoom.capacity || '-'}</p>
                        </div>
                    </div>
                </div>

                {/* Room Details Section */}
                <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('Room Details')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {meetingRoom.type === 'Physical' && (
                            <div>
                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    {t('Location')}
                                </label>
                                <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{meetingRoom.location || '-'}</p>
                            </div>
                        )}
                        {meetingRoom.type === 'Virtual' && (
                            <div>
                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                    <Link className="h-4 w-4" />
                                    {t('Booking URL')}
                                </label>
                                <div className="mt-1 flex items-center gap-2">
                                    <a href={meetingRoom.booking_url} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400 truncate">
                                        {meetingRoom.booking_url}
                                    </a>
                                    <button
                                        onClick={handleCopyLink}
                                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                                        title={t('Copy link')}
                                    >
                                        {copiedLink ? (
                                            <Check className="h-4 w-4 text-green-600" />
                                        ) : (
                                            <Copy className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                        <div>
                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                <Hash className="h-4 w-4" />
                                {t('Meetings')}
                            </label>
                            <p className="mt-1">
                                <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10 dark:bg-gray-900 dark:text-gray-300">
                                    {meetingRoom.meetings_count || 0}
                                </span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Equipment Section */}
                {meetingRoom.equipment && Array.isArray(meetingRoom.equipment) && meetingRoom.equipment.length > 0 && (
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('Equipment')}</h3>
                        <div className="flex flex-wrap gap-2">
                            {meetingRoom.equipment.map((item: string, index: number) => (
                                <span key={index} className="inline-flex items-center rounded-md bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20 dark:bg-blue-900/30 dark:text-blue-300">
                                    {item}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Description Section */}
                {meetingRoom.description && (
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('Description')}</h3>
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{meetingRoom.description}</p>
                    </div>
                )}
            </div>
        </DialogContent>
    );
}
