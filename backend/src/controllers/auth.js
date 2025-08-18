import { login, register, updateUser, updatePassword } from "../services/auth.js";
export const authController = {
  register: async (req, res, next) => {
    try {
      const result = await register(req.body);
      return res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  },
  login: async (req, res, next) => {
    try {
      const result = await login(req.body);
      return res.status(200).json(result);
    } catch (error) {
      console.log(error);
      next(error);
    }
  },

  update: async (req, res, next) => {
    try {
      const result = await updateUser(req.user.id, req.body);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },
  updatePassword: async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const result = await updatePassword(req.user.id, { currentPassword, newPassword });
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },
};