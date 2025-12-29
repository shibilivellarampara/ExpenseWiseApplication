'use client';
import React from 'react';

// Each avatar is a React functional component.

const MaleAvatar1 = () => (
    <svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
        <circle cx="64" cy="64" r="64" fill="#4A90E2"/>
        <path d="M47.5 64C47.5 54.335 55.835 46 64 46C72.165 46 80.5 54.335 80.5 64V68H47.5V64Z" fill="#A5673F"/>
        <path d="M96 112C96 90.9543 81.5817 74 64 74C46.4183 74 32 90.9543 32 112H96Z" fill="#3A75C4"/>
    </svg>
);

const MaleAvatar2 = () => (
    <svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
        <circle cx="64" cy="64" r="64" fill="#2ECC71"/>
        <path d="M47.5 64C47.5 54.335 55.835 46 64 46C72.165 46 80.5 54.335 80.5 64V68H47.5V64Z" fill="#2C3E50"/>
        <path d="M96 112C96 90.9543 81.5817 74 64 74C46.4183 74 32 90.9543 32 112H96Z" fill="#27AE60"/>
    </svg>
);

const FemaleAvatar1 = () => (
    <svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
        <circle cx="64" cy="64" r="64" fill="#F39C12"/>
        <path d="M47.5 70C47.5 58.9543 55.835 50 64 50C72.165 50 80.5 58.9543 80.5 70H47.5Z" fill="#8B572A"/>
        <path d="M96 112C96 90.9543 81.5817 74 64 74C46.4183 74 32 90.9543 32 112H96Z" fill="#E67E22"/>
    </svg>
);

const FemaleAvatar2 = () => (
    <svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
        <circle cx="64" cy="64" r="64" fill="#F1F1F1"/>
        <path d="M47.5 70C47.5 58.9543 55.835 50 64 50C72.165 50 80.5 58.9543 80.5 70H47.5Z" fill="#34495E"/>
        <path d="M96 112C96 90.9543 81.5817 74 64 74C46.4183 74 32 90.9543 32 112H96Z" fill="#3498DB"/>
    </svg>
);


const avatarToString = (avatarComponent: React.FC): string => {
    // This is a simplified "renderer" for the purpose of getting a string representation.
    if (avatarComponent === MaleAvatar1) return `<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg"><circle cx="64" cy="64" r="64" fill="#4A90E2"/><path d="M47.5 64C47.5 54.335 55.835 46 64 46C72.165 46 80.5 54.335 80.5 64V68H47.5V64Z" fill="#A5673F"/><path d="M96 112C96 90.9543 81.5817 74 64 74C46.4183 74 32 90.9543 32 112H96Z" fill="#3A75C4"/></svg>`;
    if (avatarComponent === MaleAvatar2) return `<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg"><circle cx="64" cy="64" r="64" fill="#2ECC71"/><path d="M47.5 64C47.5 54.335 55.835 46 64 46C72.165 46 80.5 54.335 80.5 64V68H47.5V64Z" fill="#2C3E50"/><path d="M96 112C96 90.9543 81.5817 74 64 74C46.4183 74 32 90.9543 32 112H96Z" fill="#27AE60"/></svg>`;
    if (avatarComponent === FemaleAvatar1) return `<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg"><circle cx="64" cy="64" r="64" fill="#F39C12"/><path d="M47.5 70C47.5 58.9543 55.835 50 64 50C72.165 50 80.5 58.9543 80.5 70H47.5Z" fill="#8B572A"/><path d="M96 112C96 90.9543 81.5817 74 64 74C46.4183 74 32 90.9543 32 112H96Z" fill="#E67E22"/></svg>`;
    if (avatarComponent === FemaleAvatar2) return `<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg"><circle cx="64" cy="64" r="64" fill="#F1F1F1"/><path d="M47.5 70C47.5 58.9543 55.835 50 64 50C72.165 50 80.5 58.9543 80.5 70H47.5Z" fill="#34495E"/><path d="M96 112C96 90.9543 81.5817 74 64 74C46.4183 74 32 90.9543 32 112H96Z" fill="#3498DB"/></svg>`;
    return '';
}

export const AvatarList = [
    { component: MaleAvatar1, svgString: avatarToString(MaleAvatar1) },
    { component: MaleAvatar2, svgString: avatarToString(MaleAvatar2) },
    { component: FemaleAvatar1, svgString: avatarToString(FemaleAvatar1) },
    { component: FemaleAvatar2, svgString: avatarToString(FemaleAvatar2) },
]
