import { TaskService } from "./services/TaskService";
import { UserService } from "./services/UserService";
import { createTaskRoutes } from "./api/taskRoutes";
import { createUserRoutes } from "./api/userRoutes";
import { APP_NAME, APP_VERSION } from "./config/AppConfig";

const taskService: TaskService = new TaskService();
const userService: UserService = new UserService();

const taskRoutes = createTaskRoutes(taskService);
const userRoutes = createUserRoutes(userService);

console.log(`${APP_NAME} v${APP_VERSION} started`);
console.log(`Loaded ${taskRoutes.length} task routes`);
console.log(`Loaded ${userRoutes.length} user routes`);
