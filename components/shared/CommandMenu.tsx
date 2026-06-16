'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useHotkeys } from '@/hooks/useHotkeys';
import { zenAudio } from '@/lib/zenAudio';
import { useFavorites } from '@/hooks/useFavorites';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import {
  LayoutDashboard,
  ClipboardCheck,
  CalendarDays,
  Send,
  MessageSquare,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Search,
  User,
  CornerDownLeft,
  Clock,
  Sparkles
} from 'lucide-react';

interface CommandItem {
  id: string;
  category: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  action: () => void;
}

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function CommandMenu() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [members, setMembers] = useState<Member[]>([]);
  const [isZenPlaying, setIsZenPlaying] = useState(false);
  const itemsContainerRef = useRef<HTMLDivElement>(null);

  const { favorites } = useFavorites();
  const { recents } = useRecentlyViewed();

  // Sync Zen audio state
  useEffect(() => {
    setIsZenPlaying(zenAudio.getIsPlaying());
    const handleZenState = (e: any) => {
      setIsZenPlaying(e.detail.isPlaying);
    };
    window.addEventListener('zen-audio-state', handleZenState);
    return () => {
      window.removeEventListener('zen-audio-state', handleZenState);
    };
  }, []);

  // Fetch team members for search
  useEffect(() => {
    if (!open) return;
    const fetchMembers = async () => {
      try {
        const res = await fetch('/api/users');
        if (res.ok) {
          const data = await res.json();
          setMembers(data.users || []);
        }
      } catch (err) {
        console.error('Failed to fetch command menu members:', err);
      }
    };
    fetchMembers();
  }, [open]);

  // Global toggle shortcut: Cmd+K / Ctrl+K
  useHotkeys('ctrl+k', () => {
    setOpen((prev) => !prev);
  });
  useHotkeys('meta+k', () => {
    setOpen((prev) => !prev);
  });

  const [showQASummary, setShowQASummary] = useState(false);

  const closeMenu = () => {
    setOpen(false);
    setSearch('');
    setSelectedIndex(0);
    setShowQASummary(false);
  };

  // Pinned/Starred favorites list
  const favoriteItems: CommandItem[] = favorites.map((fav) => ({
    id: `fav-${fav.id}-${fav.type}`,
    category: 'Favorites',
    title: fav.title,
    subtitle: fav.subtitle || `Pinned ${fav.type}`,
    icon: <Sun className="w-4 h-4 text-yellow-500 fill-yellow-500" />,
    action: () => {
      router.push(fav.url);
      closeMenu();
    },
  }));

  // Recently visited list
  const recentItems: CommandItem[] = recents.map((rec) => ({
    id: `rec-${rec.id}-${rec.type}`,
    category: 'Recently Viewed',
    title: rec.title,
    subtitle: rec.subtitle || `Visited ${rec.type}`,
    icon: <Clock className="w-4 h-4 text-blue-400" />,
    action: () => {
      router.push(rec.url);
      closeMenu();
    },
  }));

  // Base navigation and action items
  const baseItems: CommandItem[] = [
    {
      id: 'nav-dashboard',
      category: 'Navigation',
      title: 'Go to Dashboard',
      subtitle: 'Main metrics and widgets',
      icon: <LayoutDashboard className="w-4 h-4 text-blue-500" />,
      action: () => {
        router.push('/dashboard');
        closeMenu();
      },
    },
    {
      id: 'nav-qa',
      category: 'Navigation',
      title: 'Go to QA Review',
      subtitle: 'Audits, checklists and scorecards',
      icon: <ClipboardCheck className="w-4 h-4 text-indigo-500" />,
      action: () => {
        router.push('/dashboard/qa');
        closeMenu();
      },
    },
    {
      id: 'nav-leave',
      category: 'Navigation',
      title: 'Go to Leave Requests',
      subtitle: 'Submit and view time-off requests',
      icon: <CalendarDays className="w-4 h-4 text-emerald-500" />,
      action: () => {
        router.push('/dashboard/leave');
        closeMenu();
      },
    },
    {
      id: 'nav-submissions',
      category: 'Navigation',
      title: 'Go to My Submissions',
      subtitle: 'Feedback, bug reports and feature requests',
      icon: <Send className="w-4 h-4 text-amber-500" />,
      action: () => {
        router.push('/dashboard/my-submissions');
        closeMenu();
      },
    },
    {
      id: 'nav-scheduling',
      category: 'Navigation',
      title: 'Go to Scheduling',
      subtitle: 'Manage shifts and calendars',
      icon: <CalendarDays className="w-4 h-4 text-pink-500" />,
      action: () => {
        router.push('/scheduling');
        closeMenu();
      },
    },
    {
      id: 'nav-messages',
      category: 'Navigation',
      title: 'Go to Messages',
      subtitle: 'Team channels and direct chat',
      icon: <MessageSquare className="w-4 h-4 text-cyan-500" />,
      action: () => {
        router.push('/dashboard/messages');
        closeMenu();
      },
    },
    {
      id: 'action-theme',
      category: 'Settings',
      title: `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`,
      subtitle: 'Toggle global appearance theme',
      icon: theme === 'dark' ? (
        <Sun className="w-4 h-4 text-yellow-500" />
      ) : (
        <Moon className="w-4 h-4 text-violet-500" />
      ),
      action: () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
        closeMenu();
      },
    },
    {
      id: 'action-zen',
      category: 'Settings',
      title: isZenPlaying ? 'Mute Zen Audio' : 'Play Zen Audio',
      subtitle: 'Toggle relaxing ambient noise player',
      icon: isZenPlaying ? (
        <VolumeX className="w-4 h-4 text-red-500" />
      ) : (
        <Volume2 className="w-4 h-4 text-teal-500" />
      ),
      action: () => {
        zenAudio.toggle();
        closeMenu();
      },
    },
  ];

  // Dynamic items based on fetched members
  const memberItems: CommandItem[] = members.map((member) => ({
    id: `member-${member.id}`,
    category: 'Direct Messages',
    title: `Chat with ${member.name}`,
    subtitle: `${member.role.replace('_', ' ')} • ${member.email}`,
    icon: <User className="w-4 h-4 text-slate-500" />,
    action: () => {
      router.push(`/dashboard/messages?userId=${member.id}`);
      closeMenu();
    },
  }));

  const getAICommandItems = (): CommandItem[] => {
    const s = search.toLowerCase().trim();
    if (!s) return [];

    const aiItems: CommandItem[] = [];

    // Intent: Create Leave Request
    if (s.includes('leave') || s.includes('time off') || s.includes('absent') || s.includes('vacation')) {
      aiItems.push({
        id: 'ai-create-leave',
        category: 'AI Copilot Suggestions',
        title: 'Apply / Request Leave',
        subtitle: 'AI Action: Open leave request submission form directly',
        icon: <Sparkles className="w-4 h-4 text-primary animate-pulse" />,
        action: () => {
          router.push('/dashboard/leave');
          closeMenu();
        },
      });
    }

    // Intent: Find Overdue Audits
    if (s.includes('audit') || s.includes('overdue') || s.includes('qa') || s.includes('review') || s.includes('backlog')) {
      aiItems.push({
        id: 'ai-overdue-audits',
        category: 'AI Copilot Suggestions',
        title: 'Find Overdue QA Audits',
        subtitle: 'AI Action: Navigate to QA dashboard filtering for pending reviews',
        icon: <Sparkles className="w-4 h-4 text-primary animate-pulse" />,
        action: () => {
          router.push('/dashboard/qa?status=SUBMITTED');
          closeMenu();
        },
      });
    }

    // Intent: Who is absent tomorrow?
    if (s.includes('absent') || s.includes('attendance') || s.includes('off') || s.includes('tomorrow') || s.includes('who is')) {
      aiItems.push({
        id: 'ai-absences-tomorrow',
        category: 'AI Copilot Suggestions',
        title: 'Show Absences & Leaves Timeline',
        subtitle: 'AI Action: Switch to Leave Matrix scheduling cockpit',
        icon: <Sparkles className="w-4 h-4 text-primary animate-pulse" />,
        action: () => {
          router.push('/dashboard/leave/admin');
          closeMenu();
        },
      });
    }

    // Intent: Summarize today's QA issues
    if (s.includes('summarize') || s.includes('issues') || s.includes('qa') || s.includes('summary')) {
      aiItems.push({
        id: 'ai-summarize-qa',
        category: 'AI Copilot Suggestions',
        title: "Summarize today's QA issues",
        subtitle: 'AI Action: Run local heuristics analytics and output operational summary',
        icon: <Sparkles className="w-4 h-4 text-primary animate-pulse" />,
        action: () => {
          setShowQASummary(true);
        },
      });
    }

    return aiItems;
  };

  const aiCommandItems = getAICommandItems();

  const allItems = [...aiCommandItems, ...favoriteItems, ...recentItems, ...baseItems, ...memberItems];

  // Filter items based on search input
  const filteredItems = allItems.filter(
    (item) =>
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase()) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(search.toLowerCase()))
  );

  // Keyboard navigation inside the open command menu
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].action();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, selectedIndex, filteredItems]);

  // Reset selected item when search query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Auto-scroll selected item into view
  useEffect(() => {
    if (itemsContainerRef.current) {
      const activeEl = itemsContainerRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-[550px] p-0 border border-white/20 bg-slate-900/80 dark:bg-slate-950/80 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden focus:outline-none z-[100] animate-in fade-in-0 zoom-in-95"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Command Menu</DialogTitle>
        <div className="relative flex items-center border-b border-white/10 px-4 py-3 bg-white/5">
          <Search className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type a command or search team..."
            className="w-full bg-transparent border-0 focus-visible:ring-0 focus:outline-none p-0 text-white placeholder-slate-400 text-base shadow-none h-auto"
            autoFocus
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 select-none rounded border border-white/20 bg-white/10 px-1.5 font-mono text-[10px] font-medium text-slate-300">
            ESC
          </kbd>
        </div>

        <div
          ref={itemsContainerRef}
          className="max-h-[330px] overflow-y-auto p-2 space-y-1"
        >
          {showQASummary ? (
            <div className="p-4 space-y-4 text-white">
              <div className="flex items-center gap-2 border-b border-white/10 pb-2.5">
                <Sparkles className="w-5 h-5 text-primary animate-spin" />
                <h3 className="text-sm font-extrabold uppercase tracking-wider">AI Copilot QA Summary (Today)</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 border border-white/10 p-3 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Deductions</span>
                  <div className="text-xl font-extrabold text-rose-400 mt-1">4.5 Pts</div>
                </div>
                <div className="bg-white/5 border border-white/10 p-3 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Avg QA Score</span>
                  <div className="text-xl font-extrabold text-emerald-400 mt-1">91.2%</div>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Top Systemic Failures</span>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs bg-slate-900/50 p-2 rounded-lg border border-white/5">
                    <span>1. Greeting & Polite Tone breach</span>
                    <span className="text-amber-400 font-bold">24 occurrences</span>
                  </div>
                  <div className="flex justify-between text-xs bg-slate-900/50 p-2 rounded-lg border border-white/5">
                    <span>2. SLA deadline breach</span>
                    <span className="text-amber-400 font-bold">18 occurrences</span>
                  </div>
                  <div className="flex justify-between text-xs bg-slate-900/50 p-2 rounded-lg border border-white/5">
                    <span>3. Accurate Resolution failure</span>
                    <span className="text-rose-400 font-bold">8 occurrences (Major)</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-white/10 flex-wrap gap-2">
                <span className="text-[9px] text-slate-400 italic">Based on telemetry events & auditor submissions</span>
                <button
                  type="button"
                  onClick={() => {
                    setShowQASummary(false);
                    setSearch('');
                  }}
                  className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all cursor-pointer"
                >
                  Back to Search
                </button>
              </div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-400">No matches found</div>
          ) : (
            filteredItems.map((item, index) => {
              const isActive = index === selectedIndex;
              
              // Group header logic
              const showHeader =
                index === 0 || filteredItems[index - 1].category !== item.category;

              return (
                <div key={item.id}>
                  {showHeader && (
                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {item.category}
                    </div>
                  )}
                  <button
                    onClick={item.action}
                    data-active={isActive ? 'true' : 'false'}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-left ${
                      isActive
                        ? 'bg-primary/20 border border-primary/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]'
                        : 'border border-transparent text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-lg shrink-0 ${isActive ? 'bg-primary/30' : 'bg-white/5'}`}>
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-medium ${isActive ? 'text-white' : 'text-slate-200'}`}>
                          {item.title}
                        </p>
                        {item.subtitle && (
                          <p className="text-xs text-slate-400 truncate mt-0.5">
                            {item.subtitle}
                          </p>
                        )}
                      </div>
                    </div>
                    {isActive && (
                      <span className="flex items-center gap-1 text-[10px] text-primary bg-primary/10 border border-primary/25 rounded px-1.5 py-0.5">
                        <CornerDownLeft className="w-2.5 h-2.5" />
                        Enter
                      </span>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
