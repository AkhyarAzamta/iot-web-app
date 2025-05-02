import { prisma } from "../application/database.js";
import { HttpException } from "../middleware/error.js";
import { hash, verify } from "argon2";
import jwt from "jsonwebtoken";
import "dotenv/config";

export const register = async (request) => {
  try {
    const existingUser = await prisma.users.findUnique({
      where: { username: request.username },
    });
    if (existingUser) {
      throw new HttpException(409, "User already exists");
    }

    const hashedPassword = await hash(request.password);

    const user = await prisma.users.create({
      data: {
        fullname: request.fullname,
        username: request.username,
        password: hashedPassword,
      },
      select: {
        id: true,
        fullname: true,
        username: true,
        created_at: true,
      },
    });

    return {
      message: "User created successfully",
      user,
    };
  } catch (error) {
    throw new HttpException(500, "Internal Server Error");
  }
};

export const login = async (request) => {
  try {
    const user = await prisma.users.findUnique({
      where: { username: request.username },
    });

    if (!user) {
      throw new HttpException(401, "Invalid credentials");
    }

    const isPasswordValid = await verify(user.password, request.password);
    if (!isPasswordValid) {
      throw new HttpException(401, "Invalid credentials");
    }

    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_KEY,
      { expiresIn: '1h' } 
    );

    return {
      message: "Login successful",
      access_token: token,
    };
  } catch (error) {
    throw new HttpException(500, "Internal Server Error");
  }
};