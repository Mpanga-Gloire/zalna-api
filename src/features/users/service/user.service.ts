import { AppDataSource } from "../../../config/database"; // Adjust path as necessary
import { User, UserRole } from "../model//User";
import { Repository } from "typeorm";

export class UserService {
  private readonly userRepo: Repository<User>;

  constructor() {
    // Initializes the TypeORM repository for the User entity
    this.userRepo = AppDataSource.getRepository(User);
  }

  /**
   * Finds a user by their ID and returns their assigned role.
   * This ID is guaranteed to be valid because it comes from the authenticated JWT.
   * @param userId The UUID of the authenticated user.
   * @returns The user's role (CLIENT, GERANT, ADMIN, etc.).
   * @throws NotFoundError if the user somehow exists in Supabase but not in our database.
   */
  async getUserRoleById(userId: string): Promise<UserRole> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ["role"], // Select only the role column for efficiency
    });

    if (!user) {
      // CRITICAL: This case should rarely happen if user creation is correctly linked to Supabase sign-up.
      throw new Error("User record not found in database.");
    }

    return user.role;
  }
}
