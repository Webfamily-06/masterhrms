import classNames from 'classnames';
import React, { useState } from 'react';
import EmailBody from './EmailBody';
import EmailHeader from './EmailHeader';
import EmailSidebar from './EmailSidebar';
import InboxList from './Inbox';

//Redux
import { connect } from 'react-redux';

const Email = ({ startChating }) => {
    const [showSidebar, setshowSidebar] = useState(true);
    return (
        <div className="hk-pg-body py-0">
            <div className={classNames("emailapp-wrap", { "emailapp-sidebar-toggle": !showSidebar },{ "emailapp-slide": startChating })}>
                <EmailSidebar />
                <div className="emailapp-content">
                    <InboxList show={showSidebar} toggleSidebar={() => setshowSidebar(!showSidebar)} />
                    <div className="emailapp-single-email">
                        <EmailHeader />
                        <EmailBody />
                    </div>
                </div>
            </div>
        </div>

    )
}

const mapStateToProps = ({ chatReducer }) => {
    const { startChating } = chatReducer;
    return { startChating }
};

export default connect(mapStateToProps)(Email);