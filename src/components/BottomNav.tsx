import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Tag, Ticket, User , MapPinned } from 'lucide-react';
import { cn } from '@/lib/utils';
import { t } from 'i18next';

const navItems = [
  { to: '/', label: t('หน้าแรก'), icon: Home },
  // { to: '/busstop', label: t('จุดจอด'), icon: MapPinned },
  // { to: '/ticket', label: t('ค้นหา'), icon: Search },
  { to: '/promotions', label: t('โปรโมชั่น'), icon: Tag },
  { to: '/my-tickets', label: t('ตั๋วของฉัน'), icon: Ticket },
  { to: '/profile', label: t('โปรไฟล์'), icon: User },
];

// Hide bottom nav on these booking-flow routes
const hiddenRoutes = ['/ticket', '/search', '/seats', '/passengers', '/payment', '/e-ticket'];

const BottomNav = () => {
  const { pathname } = useLocation();
  const isHidden = hiddenRoutes.some(route => pathname.startsWith(route)) || 
                   pathname.startsWith('/my-tickets/');

  if (isHidden) return null;

  const storedUserStr = localStorage.getItem("user");
  let hasNoPhone = false;
  try {
    const storedUser = storedUserStr ? JSON.parse(storedUserStr) : null;
    hasNoPhone = !!(storedUser?.user && !storedUser.user.phone);
  } catch (e) {
    console.error("Error parsing user for BottomNav", e);
  }

  return (
    <nav className="fixed bottom-0 w-full z-50 bg-card border-t border-border shadow-lg" style={{ zIndex: "99" }}>
      <div className="flex justify-around items-center h-16">
        {navItems.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          const showWarning = label === 'โปรไฟล์' && hasNoPhone;

          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-xs transition-colors',
                active ? 'text-primary font-bold' : 'text-muted-foreground'
              )}
            >
              <div className="relative">
                <Icon className={cn("h-6 w-6", showWarning && !active && "text-destructive")} strokeWidth={active ? 2.5 : 1.5} />
                {showWarning && (
                  <div className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-destructive text-white rounded-full flex items-center justify-center border border-white shadow-sm animate-bounce">
                    <span className="text-[10px] font-black">!</span>
                  </div>
                )}
              </div>
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
