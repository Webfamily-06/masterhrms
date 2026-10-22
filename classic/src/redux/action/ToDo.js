import { CHANGE_VM } from "../constants/ToDo";

export function ganttViewMode(vm) {
    return {
        type: CHANGE_VM,
        vm,
    }
}