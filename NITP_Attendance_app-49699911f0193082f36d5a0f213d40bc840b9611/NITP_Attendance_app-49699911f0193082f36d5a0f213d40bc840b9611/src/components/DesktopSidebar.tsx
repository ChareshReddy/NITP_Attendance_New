'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { SidebarControl, useSidebarMode, SidebarMode } from './SidebarControl';

import { ChevronDown } from 'lucide-react';

export interface SidebarNavItem<T extends string = string> {
  id: T;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  subItems?: {
    id: T;
    label: string;
    icon?: React.ComponentType<{ className?: string }>;
  }[];
}

export interface SidebarBottomLink {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface DesktopSidebarProps<T extends string = string> {
  navItems: readonly SidebarNavItem<T>[] | SidebarNavItem<T>[] | any[];
  activeTab: T;
  onTabChange: (id: T) => void;
  layoutPillId: string;
  bottomLink?: SidebarBottomLink | null;
}

export default function DesktopSidebar<T extends string = string>({
  navItems,
  activeTab,
  onTabChange,
  layoutPillId,
  bottomLink,
}: DesktopSidebarProps<T>) {
  const asideRef = useRef<HTMLElement | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({
    payroll: true,
  });

  const { mode, setMode } = useSidebarMode();

  // Determine if sidebar is visually expanded:
  // - In 'expanded' mode: always true
  // - In 'collapsed' mode: false (unless popover is open)
  // - In 'hover' mode: true if hovered OR if popover is open
  const isExpanded = mode === 'expanded' || isPopoverOpen || (mode === 'hover' && isHovered);

  // Mouse enter handler with edge jitter prevention
  const handleMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (mode === 'hover') {
      setIsHovered(true);
    }
  }, [mode]);

  // Mouse leave handler with short delay before collapsing
  const handleMouseLeave = useCallback((e: React.MouseEvent) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    // Short delay before collapsing (200ms) to prevent flicker/jumping
    hoverTimeoutRef.current = setTimeout(() => {
      // Check if mouse actually left the aside element
      if (asideRef.current && !asideRef.current.matches(':hover')) {
        setIsHovered(false);
      }
    }, 200);
  }, []);

  // When popover closes or when mode changes, verify if mouse is actually over aside
  useEffect(() => {
    if (!isPopoverOpen && mode === 'hover') {
      if (asideRef.current && !asideRef.current.matches(':hover')) {
        setIsHovered(false);
      }
    }
  }, [isPopoverOpen, mode]);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  // When width transition ends, fire a single resize event so charts and tables resize cleanly once
  const handleTransitionEnd = (e: React.TransitionEvent<HTMLElement>) => {
    if (e.target === asideRef.current && e.propertyName === 'width') {
      window.dispatchEvent(new Event('resize'));
    }
  };

  return (
    <aside
      ref={asideRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTransitionEnd={handleTransitionEnd}
      className={`hidden md:flex flex-col shrink-0 sticky top-[65px] h-[calc(100vh-65px)] z-20 bg-card border-r border-border transition-[width] duration-300 ease-in-out py-4 shadow-xs select-none ${
        isExpanded ? 'w-60' : 'w-20'
      }`}
    >
      <nav className="flex-1 space-y-1 px-2 relative overflow-y-auto overflow-x-hidden min-h-0 custom-scrollbar-container">
        {navItems.map((item) => {
          const hasChildren = Array.isArray(item.subItems) && item.subItems.length > 0;
          const isChildActive = hasChildren && item.subItems.some((s: any) => s.id === activeTab);
          const isActive = activeTab === item.id || isChildActive;
          const isMenuOpen = openSubMenus[item.id] ?? isChildActive;

          return (
            <div key={item.id} className="relative group/navItem space-y-0.5">
              <button
                onClick={() => {
                  if (hasChildren && isExpanded) {
                    setOpenSubMenus(prev => ({ ...prev, [item.id]: !isMenuOpen }));
                  }
                  onTabChange(item.id);
                }}
                title={!isExpanded && !hasChildren ? item.label : undefined}
                aria-label={item.label}
                className={`group/btn relative w-full text-left py-2.5 px-3.5 flex items-center transition-all cursor-pointer rounded-xl border-l-[3px] ${
                  activeTab === item.id
                    ? 'border-blue-600 text-blue-600 font-bold bg-blue-50'
                    : isChildActive
                    ? 'border-blue-300 text-navy-900 font-bold bg-blue-50/50'
                    : 'border-transparent text-text-muted hover:text-navy-900 hover:bg-blue-50'
                }`}
              >
                {/* Animated sliding highlight background pill with left indicator bar */}
                {activeTab === item.id && (
                  <motion.div
                    layoutId={layoutPillId}
                    className="absolute inset-0 bg-blue-50 border-l-[3px] border-blue-600 rounded-xl -z-10 shadow-3xs"
                    transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                  />
                )}

                <item.icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-blue-600' : 'text-text-muted group-hover/btn:text-navy-900'
                  }`}
                />
                <span
                  className={`text-xs font-semibold tracking-wide ml-3.5 transition-opacity duration-200 whitespace-nowrap overflow-hidden ${
                    isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
                >
                  {item.label}
                </span>

                {/* Submenu toggle chevron when expanded */}
                {hasChildren && isExpanded && (
                  <ChevronDown
                    className={`w-3.5 h-3.5 ml-auto text-text-muted transition-transform duration-200 ${
                      isMenuOpen ? 'rotate-180 text-blue-600' : ''
                    }`}
                  />
                )}
              </button>

              {/* Tooltip on hover when collapsed (rendered as sibling, NOT inside button) */}
              {!isExpanded && (
                <div className="opacity-0 group-hover/navItem:opacity-100 transition-opacity duration-150 absolute left-full top-0 ml-3 px-3 py-2 bg-navy-900 text-white text-xs font-medium rounded-xl shadow-xl whitespace-nowrap z-50 pointer-events-auto drop-shadow-md">
                  <div className="font-bold border-b border-white/20 pb-1 mb-1 text-white">{item.label}</div>
                  {hasChildren && item.subItems && (
                    <div className="space-y-1 pt-0.5">
                      {item.subItems.map((sub: any) => {
                        const isSubActive = activeTab === sub.id;
                        return (
                          <button
                            key={sub.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onTabChange(sub.id);
                            }}
                            className={`flex items-center gap-2 w-full text-left py-1.5 px-2.5 rounded-lg text-xs transition-colors cursor-pointer ${
                              isSubActive
                                ? 'bg-blue-600 text-white font-bold'
                                : 'text-white/80 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            {sub.icon && <sub.icon className="w-3.5 h-3.5 shrink-0" />}
                            <span>{sub.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <div className="absolute top-3 -left-1 border-4 border-transparent border-r-navy-900" />
                </div>
              )}

              {/* Indented submenu items when expanded */}
              {hasChildren && isExpanded && isMenuOpen && item.subItems && (
                <div className="ml-5 pl-3 border-l-2 border-blue-100/80 space-y-1 py-1 mr-1">
                  {item.subItems.map((sub: any) => {
                    const isSubActive = activeTab === sub.id;
                    return (
                      <button
                        key={sub.id}
                        onClick={() => onTabChange(sub.id)}
                        className={`w-full text-left py-2 px-2.5 flex items-center gap-2 rounded-lg text-xs transition-all cursor-pointer ${
                          isSubActive
                            ? 'bg-blue-600 text-white font-bold shadow-xs'
                            : 'text-text-muted hover:text-navy-900 hover:bg-blue-50/70 font-medium'
                        }`}
                      >
                        {sub.icon && (
                          <sub.icon
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isSubActive ? 'text-white' : 'text-text-muted'
                            }`}
                          />
                        )}
                        <span className="truncate">{sub.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Optional bottom link (e.g. TL portal / My portal) */}
      {bottomLink && (
        <div className="px-2 border-t border-border pt-2.5 pb-1">
          <Link
            href={bottomLink.href}
            title={!isExpanded ? bottomLink.label : undefined}
            aria-label={bottomLink.label}
            className="group/link flex items-center py-2 px-3 text-text-muted hover:text-navy-900 hover:bg-blue-50 rounded-xl transition-all cursor-pointer"
          >
            <bottomLink.icon className="w-4 h-4 shrink-0 text-text-muted group-hover/link:text-navy-900 transition-colors" />
            <span
              className={`text-xs font-semibold ml-3.5 transition-opacity duration-200 whitespace-nowrap overflow-hidden ${
                isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              {bottomLink.label}
            </span>

            {/* Tooltip on hover when collapsed */}
            {!isExpanded && (
              <div className="opacity-0 group-hover/link:opacity-100 transition-opacity duration-150 absolute left-full ml-3 px-2.5 py-1 bg-navy-900 text-white text-xs font-medium rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none drop-shadow-md">
                {bottomLink.label}
                <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-4 border-transparent border-r-navy-900" />
              </div>
            )}
          </Link>
        </div>
      )}

      {/* Sidebar Control Widget */}
      <div className="px-2 pt-1 border-t border-border mt-1">
        <SidebarControl
          mode={mode}
          setMode={setMode}
          isPopoverOpen={isPopoverOpen}
          setIsPopoverOpen={setIsPopoverOpen}
          isExpanded={isExpanded}
        />
      </div>
    </aside>
  );
}
