/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextApiRequest, NextApiResponse } from 'next';
import cookie from 'cookie';

interface ApiResponse {
  success: boolean;
  message: string;
  data?: {
    fullname: string;
    email: string;
    telegramChatId?: string;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== 'GET') {
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
    const apiResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
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
    
    if (!apiResponse.ok) {
      return res.status(apiResponse.status).json({
        success: false,
        message: data.message || 'Failed to fetch profile'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Profile fetched successfully',
      data: {
        fullname: data.fullname,
        email: data.email,
        telegramChatId: data.telegramChatId
      }
    });
  } catch (error: any) {
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to fetch profile'
    });
  }
}