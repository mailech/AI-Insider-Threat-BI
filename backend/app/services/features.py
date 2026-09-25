from datetime import datetime
import math
EVENT_GROUPS={
 'auth':{'logon','logoff','logon_failed','remote_session_connect','remote_session_disconnect'},
 'privilege':{'privilege_change','group_change','account_created','account_disabled','password_change'},
 'file':{'file_read','file_write','file_delete','file_copy','file_move','file_download'},
 'usb':{'usb_insert','usb_remove','usb_file_copy','data_transfer'},
 'network':{'network_connection','http_request'},
 'process':{'app_launch','app_close'},
 'email':{'email_send','email_receive'}
}
def feature_vector(event_type,hour,bytes_transferred=0,file_count=0,is_remote=False,indicator_count=0):
    return [hour, int(hour<7 or hour>=22), int(event_type in EVENT_GROUPS['auth']),int(event_type in EVENT_GROUPS['privilege']),int(event_type in EVENT_GROUPS['file']),int(event_type in EVENT_GROUPS['usb']),int(event_type in EVENT_GROUPS['network']),int(event_type in EVENT_GROUPS['process']),int(event_type in EVENT_GROUPS['email']),int(is_remote),math.log1p(max(0,bytes_transferred or 0)),math.log1p(max(0,file_count or 0)),indicator_count]
FEATURE_NAMES=['hour','after_hours','auth_event','privilege_event','file_event','usb_event','network_event','process_event','email_event','remote','log_bytes','log_files','indicator_count']
