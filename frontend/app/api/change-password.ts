/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextApiRequest, NextApiResponse } from 'next';
import cookie from 'cookie';

interface PasswordData {
  currentPassword: string;
  newPassword: string;
}

interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const cookies = cookie.parse(req.headers.cookie || '');
  const token = cookies.token;

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Session expired. Redirecting to login...' 
    });
  }

  try {
    const body: PasswordData = req.body;
    
    const apiResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile/password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });

    // Handle non-JSON responses
    const contentType = apiResponse.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      const text = await apiResponse.text();
      return res.status(500).json({ 
        success: false, 
        message: `Unexpected response: ${text.slice(0, 100)}` 
      });
    }

    const data = await apiResponse.json();
    return res.status(apiResponse.status).json({
      success: apiResponse.ok,
      message: apiResponse.ok 
        ? 'Password changed successfully' 
        : data.message || 'Failed to change password',
      data
    });
  } catch (error: any) {
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to change password'
    });
  }
}