import React from 'react';
import { SERVER_URL } from '../api';

/**
 * Avatar — shows uploaded profile photo OR the first letter of the name.
 * Props:
 *   user        — the user object (needs .name and .profilePicture)
 *   size        — px size of the square avatar (default 40)
 *   borderRadius — css borderRadius string (default '10px')
 *   fontSize    — font size for the letter (default auto-scaled from size)
 */
const Avatar = ({ user, size = 40, borderRadius = '10px', fontSize }) => {
    const [imgError, setImgError] = React.useState(false);

    // Reset error state if the user object or profilePicture changes
    React.useEffect(() => {
        setImgError(false);
    }, [user?.profilePicture, user?.id, user?._id]);

    const letter = (user?.name || '').trim().charAt(0).toUpperCase() || 'U';
    const autoFontSize = fontSize || `${Math.round(size * 0.42)}px`;

    const picUrl = user?.profilePicture &&
                   user.profilePicture !== 'null' &&
                   user.profilePicture !== 'undefined' &&
                   user.profilePicture.trim() !== ''
        ? (user.profilePicture.startsWith('data:')
            ? user.profilePicture
            : `${SERVER_URL}${user.profilePicture}`)
        : null;

    return (
        <div style={{
            width: `${size}px`,
            height: `${size}px`,
            borderRadius,
            background: 'var(--primary)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden',
            flexShrink: 0,
        }}>
            {picUrl && !imgError ? (
                <img
                    src={picUrl}
                    alt={user?.name || 'Profile'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={() => setImgError(true)}
                />
            ) : (
                <span style={{
                    fontWeight: 900,
                    fontSize: autoFontSize,
                    color: 'white',
                    lineHeight: 1,
                    userSelect: 'none',
                }}>
                    {letter}
                </span>
            )}
        </div>
    );
};

export default Avatar;
