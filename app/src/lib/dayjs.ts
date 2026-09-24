/**
 * A single, pre-configured dayjs instance for the whole app.
 *
 * Import from HERE, never from "dayjs" directly. The clinic's dates and times
 * are meaningless without a timezone — "5:30 PM" only means the correct thing
 * when it's unambiguously IST. Centralising the plugin setup means every part
 * of the app agrees on that, instead of each file remembering to configure it.
 */
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

export default dayjs;
