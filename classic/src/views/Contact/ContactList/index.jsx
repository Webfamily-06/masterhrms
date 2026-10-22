import React, { useState } from 'react';
import ContactAppSidebar from '../ContactAppSidebar';
import ContactAppHeader from '../ContactAppHeader';
import ContactAppBody from './ContactAppBody';
import classNames from 'classnames';

const ContactList = () => {
    const [showSidebar, setShowSidebar] = useState(false);
    return (
        <div className="hk-pg-body py-0">
            <div className={classNames("contactapp-wrap", { "contactapp-sidebar-toggle": showSidebar })} >
                <ContactAppSidebar />
                <div className="contactapp-content">
                    <div className="contactapp-detail-wrap">
                        <ContactAppHeader toggleSidebar={() => setShowSidebar(!showSidebar)} show={showSidebar} />
                        <ContactAppBody />
                    </div>
                </div>
            </div>
        </div>

    )
}

export default ContactList
