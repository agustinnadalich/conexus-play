import { useQuery } from '@tanstack/react-query';
import { authFetch } from '@/api/api';

export const useMatches = () => {
  return useQuery({
    queryKey: ['matches'],
    queryFn: async () => {
      const res = await authFetch('/matches');
      if (!res.ok) throw new Error('Error al obtener los partidos');
      return res.json();
    },
  });
};
