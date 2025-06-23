import { prisma } from "../application/database.js";
import { HttpException } from "../middleware/error.js";
export const getProfile = async (userId) => {
  const user = await prisma.users.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      fullname: true,
      email: true,
      devices: true,
      created_at: true,
    },
  });
  if (!user) {
    throw new HttpException(404, "User not found");
  }
  return user;
};