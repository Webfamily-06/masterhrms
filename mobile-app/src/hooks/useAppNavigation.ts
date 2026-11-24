import { useNavigation, useRoute, NavigationProp, RouteProp } from '@react-navigation/native';
import { CombinedParamList } from '../types/navigation.types';

/**
 * Type-safe navigation hook pre-bound to CombinedParamList across all mobile modules
 */
export function useAppNavigation<T extends keyof CombinedParamList>() {
  return useNavigation<NavigationProp<CombinedParamList, T>>();
}

/**
 * Type-safe route parameters hook pre-bound to CombinedParamList across all mobile modules
 */
export function useAppRoute<T extends keyof CombinedParamList>() {
  return useRoute<RouteProp<CombinedParamList, T>>();
}
