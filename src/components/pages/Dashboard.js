import axios from 'axios';
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import '../../assets/styles/Dashboard.scss';
import ResultItem from '../resultItem/ResultItem';

const Dashboard = () => {
    const [file, setFile] = useState(null);
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [pollingIntervalId, setPollingIntervalId] = useState(null);
    const [pendingJobIds, setPendingJobIds] = useState([]);
    const [keywords, setKeywords] = useState([]);

    const pendingJobIdsRef = useRef([]);

    useEffect(() => {
        pendingJobIdsRef.current = pendingJobIds;
    }, [pendingJobIds]);

    useEffect(() => {
        if (pendingJobIds.length === 0 && pollingIntervalId) {
            clearInterval(pollingIntervalId);
            setPollingIntervalId(null);
            setIsLoading(false);
        }
    }, [pendingJobIds, pollingIntervalId]);
    
    const clearPollingInterval = () => {
        if (pollingIntervalId) {
            clearInterval(pollingIntervalId);
            setPollingIntervalId(null);
            setIsLoading(false);
        }
    };

    const checkForNewResults = async () => {
        const currentJobIds = pendingJobIdsRef.current;

        if (currentJobIds.length === 0) {
            setIsLoading(false);
            return;
        }

        try {
            const resultsResponse = await axios.get(`/keywords/results?jobIds=${encodeURIComponent(currentJobIds.join(','))}`);
            const newResults = resultsResponse.data;

            setResults(prevResults => [...prevResults, ...newResults]);

            const fetchedJobIds = new Set(newResults.map(result => result.job_id));
            const updatedJobIds = currentJobIds.filter(jobId => !fetchedJobIds.has(jobId));

            setPendingJobIds(updatedJobIds);

            if (updatedJobIds.length === 0) {
                clearPollingInterval();
            }
        } catch (error) {
            console.error('Error fetching new results:', error);
        }
    };

    const handleFileUpload = async (event) => {
        event.preventDefault();
        if (!file) return;

        setIsLoading(true);

        try {
            const formData = new FormData();
            formData.append('file', file);
            const response = await axios.post('/keywords/upload', formData);

            if (response.status === 200) {
                const jobResults = response.data;

                const keywords = jobResults.map(job => job.keyword);
                const jobIds = jobResults.map(job => job.jobId);
                setPendingJobIds(jobIds);
                setKeywords(keywords)

                const intervalId = setInterval(checkForNewResults, 5000);
                setPollingIntervalId(intervalId);
            }
        } catch (error) {
            console.error('Error processing file upload:', error);
        }
    };

    return (
        <div className="dashboard-container">
            <Link to="/search-report">Search Reports</Link>

            <form onSubmit={handleFileUpload}>
                <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files[0])} />
                <button type="submit" disabled={isLoading}>Upload CSV</button>
            </form>

            <div className="keywords-list">
                <h3>Uploaded Keywords</h3>
                <ul>
                    {keywords.map((keyword, index) => (
                        <li key={index}>{keyword}</li>
                    ))}
                </ul>
            </div>

            <div className="results-container">
                {results.map((result, index) => (
                    <ResultItem key={index} result={result} />
                ))}
            </div>

            {isLoading && <p>Loading...</p>}
        </div>
    );
};

export default Dashboard;
