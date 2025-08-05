"use client";
import { getCurrentUser } from '@/actions/get-current-user';
import { useStoreDevice } from '@/hooks/use-store-modal';
import { useRouter } from 'next/navigation'; // Diperbaiki: gunakan next/navigation bukan next/router
import { useEffect } from 'react';

export default function Layout() {
    const router = useRouter();
    const activeUser = getCurrentUser();
    const activeDevice = useStoreDevice((state) => state.activeDevice);

    useEffect(() => {
        // Periksa apakah user dan device sudah terisi
        if (!activeUser || !activeDevice) {
            // Redirect ke halaman setup jika data belum ada
            router.push('/login');
        } else {
            // Redirect ke halaman dashboard jika data tersedia
            router.push(`/${activeUser}/${activeDevice.id}`);
        }
    }, [activeUser, activeDevice, router]);

    // Tampilkan loading state selama pengecekan
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
}