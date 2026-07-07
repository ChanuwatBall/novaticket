import { useLocation } from 'react-router-dom';

const useNavigation = () => {
  const { pathname } = useLocation();

  return {
    isHomeActive: pathname === '/',
    isTicketActive: pathname === '/ticket',
    isPromotionsActive: pathname === '/promotions',
    isProfileActive: pathname === '/profile',
  };
};

export default useNavigation;
