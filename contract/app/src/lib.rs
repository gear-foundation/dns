#![no_std]

use sails_rs::gstd::program;

pub mod service;

pub struct Program(());

#[program]
impl Program {
    pub fn new() -> Self {
        service::Service::seed();
        Self(())
    }

    pub fn dns(&self) -> service::Service {
        service::Service::new()
    }
}
