import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { getLiveStream, refreshToken } from '../../API/authAPI';
import { showToast } from '../../redux/slices/toastSlice';
import LiveStreamModal from './LiveStreamModal';

const LiveStreamPage = () => {
    const { liveId } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.user);
    const [liveStream, setLiveStream] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;

        const fetchLiveStream = async () => {
            try {
                console.log(`Fetching live stream ${liveId}...`);
                let data;
                try {
                    data = await getLiveStream(liveId);
                } catch (err) {
                    if (err.response?.status === 401) {
                        console.log('Token expired, attempting refresh...');
                        const newToken = await refreshToken();
                        if (newToken) {
                            data = await getLiveStream(liveId);
                        } else {
                            throw new Error('Token refresh failed');
                        }
                    } else {
                        throw err;
                    }
                }

                if (!isMounted) return;

                if (!data || !data.host) {
                    throw new Error('Invalid live stream data: missing host');
                }

                if (!data.is_active) {
                    dispatch(showToast({ message: 'This live stream has ended', type: 'info' }));
                    navigate('/home');
                    return;
                }

                console.log('Live stream data:', data);
                setLiveStream(data);
            } catch (error) {
                console.error('Error fetching live stream:', error);
                if (isMounted) {
                    setError('Failed to load live stream');
                    dispatch(showToast({ message: 'Failed to load live stream', type: 'error' }));
                    if (error.message === 'Token refresh failed') {
                        // navigate('/login');
                        console.log('Token refresh failed.')
                    }
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchLiveStream();

        return () => {
            isMounted = false;
            setLiveStream(null);
        };
    }, [liveId, dispatch, navigate]);

    const handleStreamEnd = () => {
        console.log('Stream end handled in LiveStreamPage');
        setLiveStream(null);
        navigate('/home');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#198754]"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-screen text-white bg-black">
                <p className="text-red-500 text-lg">{error}</p>
                <button
                    onClick={() => navigate('/home')}
                    className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                    Go Back
                </button>
            </div>
        );
    }

    if (!liveStream) {
        console.log('No live stream data, not rendering modal');
        return null;
    }

    return (
        <LiveStreamModal
            liveStream={liveStream}
            onClose={handleStreamEnd}
            isHost={liveStream.host.id === user?.id}
        />
    );
};

export default LiveStreamPage;