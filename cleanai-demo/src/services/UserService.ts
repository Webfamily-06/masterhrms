import { User } from "../models/User";
import { generateId } from "../utils/generateId";
import { capitalize } from "../utils/stringHelpers";

export class UserService {
  private users: User[] = [];

  createUser(name: string, email: string): User {
    const user: User = {
      id: generateId(),
      name: capitalize(name),
      email: email.toLowerCase(),
      role: "member",
      createdAt: new Date(),
    };
    this.users.push(user);
    return user;
  }

  getUserById(id: string): User | undefined {
    return this.users.find((user: User) => user.id === id);
  }

  getUserByEmail(email: string): User | undefined {
    return this.users.find(
      (user: User) => user.email === email.toLowerCase()
    );
  }

  getAllUsers(): User[] {
    return [...this.users];
  }

  deleteUser(id: string): boolean {
    const index: number = this.users.findIndex((user: User) => user.id === id);
    if (index === -1) return false;
    this.users.splice(index, 1);
    return true;
  }

  private buildUserDisplayName(user: User): string {
    return `${user.name} (${user.email})`;
  }
}
