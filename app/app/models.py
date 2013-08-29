from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Index,
    Date
    )

from sqlalchemy.ext.declarative import declarative_base

from sqlalchemy.orm import (
    scoped_session,
    sessionmaker,
    )

from zope.sqlalchemy import ZopeTransactionExtension

DBSession = scoped_session(sessionmaker(extension=ZopeTransactionExtension()))
Base = declarative_base()

class Progress(Base):
    __tablename__ = 'progress'
    id = Column(Integer, primary_key=True)
    site = Column(String, index=True)
    session_id = Column(String, index=True)
    processed = Column(Integer)
    total = Column(Integer)

class Graph(Base):
    __tablename__ = 'graph'
    id = Column(Integer, primary_key=True)
    site = Column(String, index=True)
    session_id = Column(String, index=True)
    graph = Column(Text)
    site_name = Column(String)

 
