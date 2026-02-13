import * as signalR from '@microsoft/signalr';

const HUB_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'https://localhost:7003';

class SignalRService {
    constructor() {
        this.connection = null;
        this.alertChangedCallbacks = [];
    }

    async start() {
        if (this.connection) {
            return;
        }

        this.connection = new signalR.HubConnectionBuilder()
            .withUrl(`${HUB_URL}/hubs/alerts`)
            .withAutomaticReconnect()
            .configureLogging(signalR.LogLevel.Warning)
            .build();

        this.connection.on('AlertChanged', () => {
            this.alertChangedCallbacks.forEach(callback => callback());
        });

        this.connection.onreconnected(() => {
            console.log('SignalR reconnected');
            this.alertChangedCallbacks.forEach(callback => callback());
        });

        try {
            await this.connection.start();
            console.log('SignalR connected');
        } catch (error) {
            console.error('SignalR connection failed:', error);
            setTimeout(() => this.start(), 5000);
        }
    }

    stop() {
        if (this.connection) {
            this.connection.stop();
            this.connection = null;
        }
    }

    onAlertChanged(callback) {
        this.alertChangedCallbacks.push(callback);
        return () => {
            this.alertChangedCallbacks = this.alertChangedCallbacks.filter(cb => cb !== callback);
        };
    }
}

const signalRService = new SignalRService();
export default signalRService;
