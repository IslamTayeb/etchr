'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { motion } from 'framer-motion';
import {
    FileCode,
    // Users
} from 'lucide-react';

export function UserStats() {
    // const [userCount, setUserCount] = useState(0);
    const [readmeCount, setReadmeCount] = useState(0);
    const supabase = createClientComponentClient();

    useEffect(() => {
        async function fetchStats() {
            try {
                const { data: readmeData, error: readmeError } = await supabase
                    .from('readme_generations')
                    .select('id');

                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('id');

                console.log('README data:', readmeData);
                console.log('README error:', readmeError);
                console.log('User data:', userData);
                console.log('User error:', userError);

                if (readmeError) throw readmeError;
                if (userError) throw userError;

                setReadmeCount(readmeData?.length || 0);
                // setUserCount(userData?.length || 0);
            } catch (error) {
                console.error('Error fetching stats:', error);
            }
        }
        fetchStats();

        const userChanges = supabase
            .channel('user-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => fetchStats())
            .subscribe();

        const readmeChanges = supabase
            .channel('readme-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'readme_generations' }, () => fetchStats())
            .subscribe();

        return () => {
            userChanges.unsubscribe();
            readmeChanges.unsubscribe();
        };
    }, []);

    return (
        <div className="flex items-center space-x-4">
            {/* <div className="flex items-center text-sm">
                <Users className="h-4 w-4 mr-1" />
                <motion.span
                    key={userCount}
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                >
                    {userCount.toLocaleString()} Users
                </motion.span>
            </div> */}
            <div className="flex items-center text-sm">
                <FileCode className="h-4 w-4 mr-1" />
                <motion.span
                    key={readmeCount}
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                >
                    {readmeCount.toLocaleString()} READMEs generated
                </motion.span>
            </div>
        </div>
    );
}
