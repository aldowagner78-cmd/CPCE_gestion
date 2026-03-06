'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface DatePickerProps {
    /** Selected date value (YYYY-MM-DD format) */
    value?: string;
    /** Called when date is selected */
    onChange: (date: string) => void;
    /** Optional label */
    label?: string;
    /** Placeholder text */
    placeholder?: string;
    /** Whether field is disabled */
    disabled?: boolean;
    /** Minimum date (YYYY-MM-DD) */
    minDate?: string;
    /** Maximum date (YYYY-MM-DD) */
    maxDate?: string;
    /** Show clear button */
    clearable?: boolean;
    /** Date format for display (en or es) */
    locale?: 'en' | 'es';
}

const MONTHS = {
    en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    es: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
};

const WEEKDAYS = {
    en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    es: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
};

function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
    return new Date(year, month, 1).getDay();
}

export function DatePicker({
    value,
    onChange,
    label,
    placeholder = 'Selecciona una fecha',
    disabled = false,
    minDate,
    maxDate,
    clearable = true,
    locale = 'es',
}: DatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [displayMonth, setDisplayMonth] = useState(new Date().getMonth());
    const [displayYear, setDisplayYear] = useState(new Date().getFullYear());
    const containerRef = useRef<HTMLDivElement>(null);

    // Parse value to date
    const selectedDate = value ? new Date(value + 'T00:00:00') : null;
    const displayedDate = value && !isNaN(selectedDate!.getTime())
        ? selectedDate!.toLocaleDateString(locale === 'es' ? 'es-AR' : 'en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        })
        : '';

    // Check if date is valid
    const isDateValid = (dateStr: string): boolean => {
        const d = new Date(dateStr + 'T00:00:00');
        return !isNaN(d.getTime());
    };

    // Check if date is within range
    const isInRange = (dateStr: string): boolean => {
        if (minDate && dateStr < minDate) return false;
        if (maxDate && dateStr > maxDate) return false;
        return true;
    };

    // Handle date selection from calendar
    const handleDateSelect = (day: number) => {
        const dateStr = `${displayYear}-${String(displayMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (isInRange(dateStr)) {
            onChange(dateStr);
            setIsOpen(false);
        }
    };

    // Generate calendar days
    const daysInMonth = getDaysInMonth(displayYear, displayMonth);
    const firstDayOfMonth = getFirstDayOfMonth(displayYear, displayMonth);
    const calendarDays: (number | null)[] = [];

    // Empty cells for days before month starts
    for (let i = 0; i < firstDayOfMonth; i++) {
        calendarDays.push(null);
    }

    // Days of month
    for (let i = 1; i <= daysInMonth; i++) {
        calendarDays.push(i);
    }

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    // Sync calendar display with selected date
    useEffect(() => {
        if (selectedDate && !isNaN(selectedDate.getTime())) {
            setDisplayMonth(selectedDate.getMonth());
            setDisplayYear(selectedDate.getFullYear());
        }
    }, [selectedDate, isOpen]);

    return (
        <div ref={containerRef} className="relative w-full">
            {label && (
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">
                    {label}
                </label>
            )}

            <div className="relative">
                <Input
                    type="text"
                    value={displayedDate}
                    placeholder={placeholder}
                    disabled={disabled}
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    readOnly
                    className="cursor-pointer pr-10"
                />

                {clearable && value && (
                    <button
                        onClick={() => onChange('')}
                        disabled={disabled}
                        className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {isOpen && !disabled && (
                <div className="absolute z-50 mt-1 w-72 bg-background border rounded-lg shadow-xl p-4">
                    {/* Month/Year Navigation */}
                    <div className="flex items-center justify-between mb-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                if (displayMonth === 0) {
                                    setDisplayMonth(11);
                                    setDisplayYear(displayYear - 1);
                                } else {
                                    setDisplayMonth(displayMonth - 1);
                                }
                            }}
                            className="h-8 w-8"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>

                        <div className="text-sm font-semibold">
                            {MONTHS[locale][displayMonth]} {displayYear}
                        </div>

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                if (displayMonth === 11) {
                                    setDisplayMonth(0);
                                    setDisplayYear(displayYear + 1);
                                } else {
                                    setDisplayMonth(displayMonth + 1);
                                }
                            }}
                            className="h-8 w-8"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Weekdays */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {WEEKDAYS[locale].map(day => (
                            <div key={day} className="text-xs font-semibold text-muted-foreground text-center py-1">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Days */}
                    <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map((day, idx) => {
                            const dateStr = day
                                ? `${displayYear}-${String(displayMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                                : null;
                            const isSelected = dateStr === value;
                            const isDisabled = !day || !isInRange(dateStr || '');
                            const isToday = day && new Date().toDateString() === new Date(dateStr + 'T00:00:00').toDateString();

                            return (
                                <button
                                    key={idx}
                                    onClick={() => day && !isDisabled && handleDateSelect(day)}
                                    disabled={isDisabled}
                                    className={`
                                        h-8 text-sm rounded transition-colors
                                        ${!day ? 'invisible' : ''}
                                        ${isDisabled ? 'text-muted-foreground/50 cursor-not-allowed' : ''}
                                        ${isSelected ? 'bg-primary text-primary-foreground font-semibold' : ''}
                                        ${isToday && !isSelected ? 'border border-primary text-primary font-medium' : ''}
                                        ${!isDisabled && !isSelected && !isToday ? 'hover:bg-muted' : ''}
                                    `}
                                >
                                    {day}
                                </button>
                            );
                        })}
                    </div>

                    {/* Today Button */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            const today = new Date().toISOString().split('T')[0];
                            if (isInRange(today)) {
                                onChange(today);
                                setIsOpen(false);
                            }
                        }}
                        className="w-full mt-3 text-xs"
                    >
                        {locale === 'es' ? 'Hoy' : 'Today'}
                    </Button>
                </div>
            )}
        </div>
    );
}
