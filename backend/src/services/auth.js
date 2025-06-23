import { prisma } from "../application/database.js";
import { HttpException } from "../middleware/error.js";
import { hash, verify } from "argon2";
import jwt from "jsonwebtoken";
import "dotenv/config";

export const register = async (request) => {
  try {
    const existingUser = await prisma.users.findUnique({
      where: { email: request.email },
    });
    if (existingUser) {
      throw new HttpException(409, "Email already exists");
    }

    const hashedPassword = await hash(request.password);
    const user = await prisma.users.create({
      data: {
        fullname: request.fullname,
        email: request.email,
        password: hashedPassword,
        telegramChatId: request.telegramChatId
      },
      select: {
        id: true,
        fullname: true,
        email: true,
        telegramChatId: true,
        created_at: true,
      },
    });

    return {
      message: "User created successfully",
      user,
    };
  } catch (error) {
    if (error instanceof HttpException) {
      throw error;
    }
    throw new HttpException(500, "Internal Server Error");
  }
};

export const login = async (request) => {
  try {
    const user = await prisma.users.findUnique({
      where: { email: request.email },
      select: {
        id: true,
        fullname: true,
        email: true,
        password: true,
      },
    });

    if (!user) {
      throw new HttpException(401, "Invalid credentials");
    }

    const isPasswordValid = await verify(user.password, request.password);
    if (!isPasswordValid) {
      throw new HttpException(401, "Invalid credentials");
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_KEY,
      { expiresIn: '24h' }
    );

    return {
      message: "Login successful",
      access_token: token,
    };
  } catch (error) {
    if (error instanceof HttpException) {
      throw error;
    }
    throw new HttpException(500, "Internal Server Error");
  }
};
