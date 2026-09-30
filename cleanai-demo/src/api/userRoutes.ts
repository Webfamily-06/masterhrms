import { UserService } from "../services/UserService";
import { formatDate } from "../utils/formatDate";
import { ApiResponse } from "../types/ApiResponse";

interface Route {
  method: string;
  path: string;
  handler: () => ApiResponse;
}

export function createUserRoutes(userService: UserService): Route[] {
  return [
    {
      method: "GET",
      path: "/users",
      handler: (): ApiResponse => {
        const users = userService.getAllUsers();
        return { success: true, data: users };
      },
    },
    {
      method: "POST",
      path: "/users",
      handler: (): ApiResponse => {
        const user = userService.createUser("New User", "user@example.com");
        return { success: true, data: user };
      },
    },
  ];
}
