/**
 * User Menu Component
 * Displays current user info, role badge, and logout/switch role
 */

import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  User,
  LogOut,
  Settings,
  Shield,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';

const roleColors = {
  admin: 'text-red-400 bg-red-950/50',
  manager: 'text-purple-400 bg-purple-950/50',
  analyst: 'text-cyan-400 bg-cyan-950/50',
  viewer: 'text-slate-400 bg-slate-800/50',
};

const roleLabels = {
  admin: 'Administrator',
  manager: 'Security Manager',
  analyst: 'Security Analyst',
  viewer: 'View Only',
};

export function UserMenu() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated || !user) return null;

  const handleLogout = async () => {
    await logout();
    navigate('/Login');
  };

  const handleSwitchRole = async () => {
    await logout();
    navigate('/Login');
  };

  const roleColor = roleColors[user.role] || roleColors.viewer;
  const roleLabel = roleLabels[user.role] || user.role;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 text-slate-300 hover:text-white hover:bg-slate-800/50 px-2"
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-medium leading-tight">{user.name || user.email}</p>
            <p className={`text-[10px] leading-tight ${roleColor.split(' ')[0]}`}>{roleLabel}</p>
          </div>
          <ChevronDown className="w-3 h-3 text-slate-500" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 bg-slate-900 border-slate-800 text-slate-300"
      >
        <DropdownMenuLabel className="text-slate-400 font-normal">
          <div className="flex items-center gap-3 py-1">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
              <span className={`inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${roleColor}`}>
                <Shield className="w-2.5 h-2.5" />
                {roleLabel}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="bg-slate-800" />

        {(user.role === 'admin' || user.role === 'manager') && (
          <DropdownMenuItem
            onClick={() => navigate('/Settings')}
            className="text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </DropdownMenuItem>
        )}

        <DropdownMenuItem
          onClick={handleSwitchRole}
          className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/30 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Switch Role
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-slate-800" />

        <DropdownMenuItem
          onClick={handleLogout}
          className="text-red-400 hover:text-red-300 hover:bg-red-950/30 cursor-pointer"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default UserMenu;
