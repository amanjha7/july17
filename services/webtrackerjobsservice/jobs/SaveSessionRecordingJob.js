const { BaseJob } = require("../../base/basejob");
const SessionRecording = require("../../../src/models/sessionrecording");
const { logger } = require("../../../src/config/logger");

class SaveSessionRecordingJob extends BaseJob {
    constructor(data) {
        super();
        this.data = data;
    }

    completed(job) {
        logger.info(`SaveSessionRecordingJob completed: ${job.id}`);
    }

    failed(job) {
        logger.error(`SaveSessionRecordingJob failed: ${job.id}`);
    }

    async handle(job) {
        const taskData = this.data || job.data.data;
        const { token, visitor_id, session_id, events } = taskData;

        logger.info(`Processing SaveSessionRecordingJob in background for session: ${session_id}`);

        let recording = await SessionRecording.findOne({ session_id, tracking_token: token });
        if (!recording) {
            recording = new SessionRecording({
                session_id,
                visitor_id,
                tracking_token: token,
                events: events
            });
        } else {
            recording.events.push(...events);
            recording.updated_at = Date.now();
        }

        await recording.save();
        logger.info(`Background: Session recording chunk saved/appended successfully for session: ${session_id}`);
    }
}

module.exports = { SaveSessionRecordingJob };
