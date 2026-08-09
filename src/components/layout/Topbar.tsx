import { useState } from 'react';
import { Bell, Menu, Search, ChevronsLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { notifications, currentUser } from '@/data/mockData';
import { severityConfig } from '@/lib/alertConfig';
import { cn } from '@/lib/utils';

interface TopbarProps {
  onToggleSidebar: () => void;
  collapsed: boolean;
}

export function Topbar({ onToggleSidebar, collapsed }: TopbarProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md">
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleSidebar}
        className="shrink-0 text-muted-foreground hover:text-foreground lg:flex"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="relative flex-1 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search employees, alerts, cases..."
          className="h-9 border-border bg-card pl-9 text-sm placeholder:text-muted-foreground"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative text-muted-foreground hover:text-foreground"
            >
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                  {unread}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-80 rounded-lg border-border bg-popover p-0"
          >
            <DropdownMenuLabel className="flex items-center justify-between px-3 py-3">
              <span className="text-sm font-semibold">Notifications</span>
              <Badge variant="secondary" className="text-[10px]">
                {unread} new
              </Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-80 overflow-y-auto scrollbar-thin">
              {notifications.map((n) => {
                const sev = severityConfig[n.severity];
                return (
                  <div
                    key={n.id}
                    className={cn(
                      'flex gap-3 border-b border-border/50 px-3 py-3 last:border-0',
                      !n.read && 'bg-accent/30'
                    )}
                  >
                    <span
                      className={cn(
                        'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                        sev.dot
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground">
                        {n.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {n.description}
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground/70">
                        {n.timestamp}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 rounded-md py-1 pl-1 pr-2 transition-colors hover:bg-accent">
              <Avatar className="h-8 w-8 border border-border">
                <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                  {currentUser.initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden flex-col items-start leading-none sm:flex">
                <span className="text-xs font-medium text-foreground">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {currentUser.email}
                </span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 rounded-lg border-border bg-popover"
          >
            <DropdownMenuLabel className="flex items-center justify-between px-3 py-2.5">
              <div className="flex flex-col">
                <span className="text-sm font-semibold">{currentUser.name}</span>
                <span className="text-[10px] text-muted-foreground">
                  {currentUser.email}
                </span>
              </div>
              <Badge className="bg-primary/10 text-primary">{currentUser.role}</Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-sm">Profile</DropdownMenuItem>
            <DropdownMenuItem className="text-sm">Preferences</DropdownMenuItem>
            <DropdownMenuItem className="text-sm">Activity Log</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-sm text-destructive focus:text-destructive"
              onClick={() => navigate('/')}
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
